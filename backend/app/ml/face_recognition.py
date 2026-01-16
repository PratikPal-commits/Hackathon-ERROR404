"""
Face recognition service using the face_recognition library.
Handles face detection, embedding generation, and comparison.
"""

import base64
import io
import pickle
from typing import Optional, Tuple, List
import logging

import numpy as np
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

# Try to import face_recognition, provide fallback if not available
try:
    import face_recognition

    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    logger.warning(
        "face_recognition library not available. "
        "Face recognition features will be simulated."
    )


class FaceRecognitionService:
    """
    Service for face recognition operations.

    Uses the face_recognition library which is built on dlib.
    Falls back to simulation if the library is not available.
    """

    def __init__(self):
        self.tolerance = settings.face_recognition_tolerance
        self.min_confidence = settings.min_face_confidence

    def decode_base64_image(self, base64_string: str) -> Optional[np.ndarray]:
        """
        Decode a base64 encoded image to numpy array.

        Args:
            base64_string: Base64 encoded image string

        Returns:
            Numpy array of the image or None if decoding fails
        """
        try:
            # Remove data URL prefix if present
            if "," in base64_string:
                base64_string = base64_string.split(",")[1]

            image_data = base64.b64decode(base64_string)
            image = Image.open(io.BytesIO(image_data))

            # Convert to RGB if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")

            return np.array(image)
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {e}")
            return None

    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detect faces in an image.

        Args:
            image: Numpy array of the image

        Returns:
            List of face locations as (top, right, bottom, left) tuples
        """
        if not FACE_RECOGNITION_AVAILABLE:
            # Simulate face detection
            return [(100, 200, 300, 50)]  # Fake face location

        try:
            face_locations = face_recognition.face_locations(image)
            return face_locations
        except Exception as e:
            logger.error(f"Face detection failed: {e}")
            return []

    def generate_embedding(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Generate a 128-dimensional face embedding from an image.

        Args:
            image: Numpy array of the image containing a face

        Returns:
            128-dimensional numpy array embedding or None if no face found
        """
        if not FACE_RECOGNITION_AVAILABLE:
            # Simulate embedding generation
            return np.random.rand(128).astype(np.float64)

        try:
            # Get face locations
            face_locations = face_recognition.face_locations(image)

            if not face_locations:
                logger.warning("No face detected in image")
                return None

            # Get embeddings for all detected faces
            embeddings = face_recognition.face_encodings(image, face_locations)

            if not embeddings:
                logger.warning("Could not generate embedding")
                return None

            # Return the first face embedding
            return embeddings[0]

        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return None

    def generate_embedding_from_base64(self, base64_image: str) -> Optional[np.ndarray]:
        """
        Generate embedding from a base64 encoded image.

        Args:
            base64_image: Base64 encoded image string

        Returns:
            128-dimensional numpy array embedding or None
        """
        image = self.decode_base64_image(base64_image)
        if image is None:
            return None
        return self.generate_embedding(image)

    def compare_faces(
        self, known_embedding: np.ndarray, face_image: np.ndarray
    ) -> Tuple[bool, float]:
        """
        Compare a face image against a known embedding.

        Args:
            known_embedding: The stored face embedding
            face_image: Numpy array of the face image to compare

        Returns:
            Tuple of (is_match, confidence_score)
        """
        if not FACE_RECOGNITION_AVAILABLE:
            # Simulate comparison with random result
            confidence = np.random.uniform(0.7, 0.99)
            return (confidence > 0.8, confidence)

        try:
            # Generate embedding for the new face
            new_embedding = self.generate_embedding(face_image)

            if new_embedding is None:
                return (False, 0.0)

            # Calculate face distance (lower = more similar)
            distance = face_recognition.face_distance([known_embedding], new_embedding)[
                0
            ]

            # Convert distance to confidence score (0 to 1, higher = more confident)
            confidence = 1.0 - distance

            # Check if it's a match based on tolerance
            is_match = distance <= self.tolerance

            return (is_match, float(confidence))

        except Exception as e:
            logger.error(f"Face comparison failed: {e}")
            return (False, 0.0)

    def compare_faces_from_base64(
        self, known_embedding: bytes, base64_image: str
    ) -> Tuple[bool, float]:
        """
        Compare a base64 encoded face image against a stored embedding.

        Args:
            known_embedding: The stored face embedding (pickled bytes)
            base64_image: Base64 encoded face image

        Returns:
            Tuple of (is_match, confidence_score)
        """
        try:
            # Deserialize the stored embedding
            stored_embedding = pickle.loads(known_embedding)

            # Decode the base64 image
            face_image = self.decode_base64_image(base64_image)
            if face_image is None:
                return (False, 0.0)

            return self.compare_faces(stored_embedding, face_image)

        except Exception as e:
            logger.error(f"Face comparison from base64 failed: {e}")
            return (False, 0.0)

    def serialize_embedding(self, embedding: np.ndarray) -> bytes:
        """
        Serialize a face embedding for database storage.

        Args:
            embedding: The face embedding numpy array

        Returns:
            Pickled bytes of the embedding
        """
        return pickle.dumps(embedding)

    def deserialize_embedding(self, data: bytes) -> np.ndarray:
        """
        Deserialize a face embedding from database storage.

        Args:
            data: Pickled bytes of the embedding

        Returns:
            The face embedding numpy array
        """
        return pickle.loads(data)

    def find_matching_face(
        self, face_image: np.ndarray, embeddings: List[Tuple[int, bytes]]
    ) -> Optional[Tuple[int, float]]:
        """
        Find a matching face from a list of stored embeddings.
        Useful for detecting if same face is used for multiple students.

        Args:
            face_image: The face image to search for
            embeddings: List of (student_id, embedding_bytes) tuples

        Returns:
            Tuple of (student_id, confidence) if match found, None otherwise
        """
        new_embedding = self.generate_embedding(face_image)
        if new_embedding is None:
            return None

        best_match = None
        best_confidence = 0.0

        for student_id, embedding_bytes in embeddings:
            try:
                stored_embedding = self.deserialize_embedding(embedding_bytes)
                is_match, confidence = self.compare_faces(stored_embedding, face_image)

                if is_match and confidence > best_confidence:
                    best_confidence = confidence
                    best_match = student_id

            except Exception as e:
                logger.error(f"Error comparing with student {student_id}: {e}")
                continue

        if best_match is not None:
            return (best_match, best_confidence)

        return None


# Singleton instance
face_recognition_service = FaceRecognitionService()
