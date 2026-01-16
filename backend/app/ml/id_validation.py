"""
ID Card validation service using OCR.
Extracts student information from ID card images.
"""

import base64
import io
import json
import re
import logging
from typing import Optional, Dict, Tuple

from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

# Try to import pytesseract
try:
    import pytesseract

    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logger.warning("pytesseract not available. ID card validation will be simulated.")


class IDCardValidationService:
    """
    Service for validating student ID cards using OCR.

    Extracts text from ID card images and validates against stored data.
    """

    def __init__(self):
        self.min_confidence = 0.7

    def decode_base64_image(self, base64_string: str) -> Optional[Image.Image]:
        """
        Decode a base64 encoded image.

        Args:
            base64_string: Base64 encoded image string

        Returns:
            PIL Image or None if decoding fails
        """
        try:
            if "," in base64_string:
                base64_string = base64_string.split(",")[1]

            image_data = base64.b64decode(base64_string)
            image = Image.open(io.BytesIO(image_data))

            return image
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {e}")
            return None

    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR results.

        Args:
            image: PIL Image

        Returns:
            Preprocessed PIL Image
        """
        # Convert to grayscale
        if image.mode != "L":
            image = image.convert("L")

        # Resize if too small
        min_width = 800
        if image.width < min_width:
            ratio = min_width / image.width
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        return image

    def extract_text(self, image: Image.Image) -> str:
        """
        Extract text from an image using OCR.

        Args:
            image: PIL Image

        Returns:
            Extracted text string
        """
        if not OCR_AVAILABLE:
            # Simulate OCR
            return "STUDENT ID CARD\nName: John Doe\nRoll No: CS2024001\nDepartment: Computer Science"

        try:
            preprocessed = self.preprocess_image(image)
            text = pytesseract.image_to_string(preprocessed)
            return text
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return ""

    def extract_id_data(self, text: str) -> Dict[str, Optional[str]]:
        """
        Extract structured data from OCR text.

        Args:
            text: Raw OCR text

        Returns:
            Dictionary with extracted fields
        """
        data = {
            "roll_no": None,
            "name": None,
            "department": None,
            "college": None,
        }

        # Clean and normalize text
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        full_text = " ".join(lines).upper()

        # Pattern for roll number (adjust based on your format)
        # Common patterns: CS2024001, 2024CS001, 2024/CS/001
        roll_patterns = [
            r"ROLL\s*(?:NO|NUMBER|#)?[:\s]*([A-Z]{2,4}\d{4,10})",
            r"([A-Z]{2,4}\d{4,10})",
            r"(\d{4}[/\-]?[A-Z]{2,4}[/\-]?\d{3,6})",
        ]

        for pattern in roll_patterns:
            match = re.search(pattern, full_text)
            if match:
                data["roll_no"] = match.group(1).replace(" ", "")
                break

        # Pattern for name
        name_patterns = [
            r"NAME[:\s]+([A-Z][A-Z\s]+)",
            r"STUDENT[:\s]+([A-Z][A-Z\s]+)",
        ]

        for pattern in name_patterns:
            match = re.search(pattern, full_text)
            if match:
                data["name"] = match.group(1).strip()
                break

        # Pattern for department
        dept_patterns = [
            r"(?:DEPT|DEPARTMENT|BRANCH)[:\s]+([A-Z\s]+)",
            r"(COMPUTER\s*SCIENCE|ELECTRONICS|MECHANICAL|CIVIL|ELECTRICAL)",
        ]

        for pattern in dept_patterns:
            match = re.search(pattern, full_text)
            if match:
                data["department"] = match.group(1).strip()
                break

        return data

    def validate_id_card(
        self, base64_image: str, expected_roll_no: str, expected_name: str
    ) -> Tuple[bool, float, Dict]:
        """
        Validate an ID card image against expected data.

        Args:
            base64_image: Base64 encoded ID card image
            expected_roll_no: Expected roll number
            expected_name: Expected student name

        Returns:
            Tuple of (is_valid, confidence, extracted_data)
        """
        image = self.decode_base64_image(base64_image)
        if image is None:
            return (False, 0.0, {})

        # Extract text
        text = self.extract_text(image)
        if not text:
            return (False, 0.0, {})

        # Extract structured data
        extracted_data = self.extract_id_data(text)
        extracted_data["raw_text"] = text

        # Calculate confidence based on matches
        confidence = 0.0
        matches = 0
        total_checks = 2

        # Check roll number
        if extracted_data["roll_no"]:
            extracted_roll = extracted_data["roll_no"].upper().replace(" ", "")
            expected_roll = expected_roll_no.upper().replace(" ", "")

            if extracted_roll == expected_roll:
                matches += 1
                confidence += 0.5
            elif expected_roll in extracted_roll or extracted_roll in expected_roll:
                matches += 0.5
                confidence += 0.25

        # Check name (fuzzy match)
        if extracted_data["name"]:
            extracted_name = extracted_data["name"].upper()
            expected_name_upper = expected_name.upper()

            # Simple fuzzy match: check if significant parts of name match
            expected_parts = expected_name_upper.split()
            matched_parts = sum(1 for part in expected_parts if part in extracted_name)

            if matched_parts == len(expected_parts):
                matches += 1
                confidence += 0.5
            elif matched_parts > 0:
                matches += matched_parts / len(expected_parts)
                confidence += 0.25 * (matched_parts / len(expected_parts))

        # Determine if valid
        is_valid = confidence >= self.min_confidence

        return (is_valid, confidence, extracted_data)

    def serialize_id_data(self, data: Dict) -> str:
        """Serialize ID card data for storage."""
        return json.dumps(data)

    def deserialize_id_data(self, data: str) -> Dict:
        """Deserialize ID card data from storage."""
        return json.loads(data)


# Singleton instance
id_validation_service = IDCardValidationService()
