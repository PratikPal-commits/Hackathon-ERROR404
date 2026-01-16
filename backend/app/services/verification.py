"""
Multi-factor verification service.
Combines face recognition, ID card validation, and fingerprint matching.
"""

import logging
from typing import Optional, Tuple
from dataclasses import dataclass

from app.ml.face_recognition import face_recognition_service
from app.ml.id_validation import id_validation_service
from app.ml.fingerprint import fingerprint_service
from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class VerificationResult:
    """Result of multi-factor verification."""

    success: bool
    face_verified: bool = False
    face_confidence: float = 0.0
    id_card_verified: bool = False
    id_card_confidence: float = 0.0
    fingerprint_verified: bool = False
    overall_confidence: float = 0.0
    verification_method: str = ""
    message: str = ""
    anomaly_detected: bool = False
    anomaly_reason: Optional[str] = None


class VerificationService:
    """
    Service for multi-factor attendance verification.

    Implements the verification logic:
    IF face_match AND id_match AND fingerprint_match → Mark attendance
    ELSE → Log anomaly
    """

    def __init__(self):
        self.face_service = face_recognition_service
        self.id_service = id_validation_service
        self.fingerprint_service = fingerprint_service

        # Minimum confidence thresholds
        self.min_face_confidence = settings.min_face_confidence
        self.min_overall_confidence = 0.7

        # Weights for calculating overall confidence
        self.face_weight = 0.5
        self.id_weight = 0.3
        self.fingerprint_weight = 0.2

    def verify_face(
        self, face_image_base64: str, stored_embedding: bytes
    ) -> Tuple[bool, float]:
        """
        Verify face against stored embedding.

        Args:
            face_image_base64: Base64 encoded face image
            stored_embedding: Stored face embedding bytes

        Returns:
            Tuple of (is_match, confidence)
        """
        if not stored_embedding:
            return (False, 0.0)

        return self.face_service.compare_faces_from_base64(
            stored_embedding, face_image_base64
        )

    def verify_id_card(
        self, id_card_image_base64: str, expected_roll_no: str, expected_name: str
    ) -> Tuple[bool, float]:
        """
        Verify ID card against expected data.

        Args:
            id_card_image_base64: Base64 encoded ID card image
            expected_roll_no: Expected roll number
            expected_name: Expected student name

        Returns:
            Tuple of (is_valid, confidence)
        """
        is_valid, confidence, _ = self.id_service.validate_id_card(
            id_card_image_base64, expected_roll_no, expected_name
        )
        return (is_valid, confidence)

    def verify_fingerprint(
        self, fingerprint_token: str, stored_hash: str
    ) -> Tuple[bool, float]:
        """
        Verify fingerprint token against stored hash.

        Args:
            fingerprint_token: Provided fingerprint token
            stored_hash: Stored fingerprint hash

        Returns:
            Tuple of (is_match, confidence)
        """
        if not stored_hash:
            return (False, 0.0)

        return self.fingerprint_service.verify_fingerprint(
            fingerprint_token, stored_hash
        )

    def calculate_overall_confidence(
        self, face_confidence: float, id_confidence: float, fingerprint_match: bool
    ) -> float:
        """
        Calculate weighted overall confidence score.

        Args:
            face_confidence: Face verification confidence
            id_confidence: ID card verification confidence
            fingerprint_match: Whether fingerprint matched

        Returns:
            Overall confidence score (0.0 to 1.0)
        """
        fingerprint_confidence = 0.95 if fingerprint_match else 0.0

        overall = (
            face_confidence * self.face_weight
            + id_confidence * self.id_weight
            + fingerprint_confidence * self.fingerprint_weight
        )

        return min(overall, 1.0)

    def verify_student(
        self,
        student_roll_no: str,
        student_name: str,
        stored_face_embedding: Optional[bytes],
        stored_fingerprint_hash: Optional[str],
        face_image_base64: Optional[str] = None,
        id_card_image_base64: Optional[str] = None,
        fingerprint_token: Optional[str] = None,
    ) -> VerificationResult:
        """
        Perform multi-factor verification for a student.

        Args:
            student_roll_no: Student's roll number
            student_name: Student's name
            stored_face_embedding: Stored face embedding (if enrolled)
            stored_fingerprint_hash: Stored fingerprint hash (if enrolled)
            face_image_base64: Face image for verification
            id_card_image_base64: ID card image for verification
            fingerprint_token: Fingerprint token for verification

        Returns:
            VerificationResult with all verification details
        """
        result = VerificationResult(success=False)
        verification_methods = []

        # Track what was verified
        face_verified = False
        face_confidence = 0.0
        id_verified = False
        id_confidence = 0.0
        fingerprint_verified = False

        # Verify face if provided
        if face_image_base64 and stored_face_embedding:
            face_verified, face_confidence = self.verify_face(
                face_image_base64, stored_face_embedding
            )
            result.face_verified = face_verified
            result.face_confidence = face_confidence
            verification_methods.append("face")

            if face_verified:
                logger.info(
                    f"Face verified for {student_roll_no} with confidence {face_confidence:.2f}"
                )
            else:
                logger.warning(f"Face verification failed for {student_roll_no}")

        # Verify ID card if provided
        if id_card_image_base64:
            id_verified, id_confidence = self.verify_id_card(
                id_card_image_base64, student_roll_no, student_name
            )
            result.id_card_verified = id_verified
            result.id_card_confidence = id_confidence
            verification_methods.append("id_card")

            if id_verified:
                logger.info(
                    f"ID card verified for {student_roll_no} with confidence {id_confidence:.2f}"
                )
            else:
                logger.warning(f"ID card verification failed for {student_roll_no}")

        # Verify fingerprint if provided
        if fingerprint_token and stored_fingerprint_hash:
            fingerprint_verified, _ = self.verify_fingerprint(
                fingerprint_token, stored_fingerprint_hash
            )
            result.fingerprint_verified = fingerprint_verified
            verification_methods.append("fingerprint")

            if fingerprint_verified:
                logger.info(f"Fingerprint verified for {student_roll_no}")
            else:
                logger.warning(f"Fingerprint verification failed for {student_roll_no}")

        # Calculate overall confidence
        result.overall_confidence = self.calculate_overall_confidence(
            face_confidence, id_confidence, fingerprint_verified
        )

        # Set verification method string
        result.verification_method = (
            "+".join(verification_methods) if verification_methods else "none"
        )

        # Determine success based on available verification methods
        if not verification_methods:
            result.success = False
            result.message = "No verification data provided"
            result.anomaly_detected = True
            result.anomaly_reason = "No biometric data provided for verification"

        elif len(verification_methods) == 1:
            # Single factor verification
            if "face" in verification_methods:
                result.success = (
                    face_verified and face_confidence >= self.min_face_confidence
                )
            elif "id_card" in verification_methods:
                result.success = id_verified
            elif "fingerprint" in verification_methods:
                result.success = fingerprint_verified

            if not result.success:
                result.anomaly_detected = True
                result.anomaly_reason = (
                    f"Single factor verification failed: {verification_methods[0]}"
                )
            result.message = f"Single factor ({verification_methods[0]}) verification"

        elif len(verification_methods) == 2:
            # Two-factor verification - both must pass
            checks = [face_verified, id_verified, fingerprint_verified]
            passed = sum(
                1
                for m in verification_methods
                if (m == "face" and face_verified)
                or (m == "id_card" and id_verified)
                or (m == "fingerprint" and fingerprint_verified)
            )

            result.success = passed == 2

            if not result.success:
                result.anomaly_detected = True
                result.anomaly_reason = (
                    f"Two-factor verification failed: only {passed}/2 passed"
                )
            result.message = f"Two-factor verification: {passed}/2 passed"

        else:
            # Full three-factor verification
            all_passed = face_verified and id_verified and fingerprint_verified
            result.success = all_passed

            if not all_passed:
                failed = []
                if not face_verified:
                    failed.append("face")
                if not id_verified:
                    failed.append("id_card")
                if not fingerprint_verified:
                    failed.append("fingerprint")

                result.anomaly_detected = True
                result.anomaly_reason = (
                    f"Multi-factor verification failed: {', '.join(failed)}"
                )

            result.message = "Three-factor verification" + (
                " passed" if all_passed else " failed"
            )

        return result


# Singleton instance
verification_service = VerificationService()
