"""
Fingerprint service (simulated).
Handles fingerprint token generation and verification.

In a real implementation, this would interface with fingerprint
scanner hardware SDK. For this demo, we simulate fingerprint
matching using token-based verification.
"""

import hashlib
import secrets
import logging
from typing import Tuple

from app.utils.hashing import hash_fingerprint, verify_fingerprint

logger = logging.getLogger(__name__)


class FingerprintService:
    """
    Simulated fingerprint service.

    In production, this would integrate with actual fingerprint
    scanner hardware (e.g., SecuGen, DigitalPersona, etc.).

    For simulation purposes:
    - Enrollment: Generate a unique token that represents the fingerprint
    - Verification: Compare provided token against stored hash
    """

    def __init__(self):
        self.token_length = 64  # Length of simulated fingerprint token

    def generate_fingerprint_token(self) -> str:
        """
        Generate a simulated fingerprint token.

        In production, this would capture actual fingerprint data
        from the scanner and generate a unique identifier.

        Returns:
            A unique token string representing the fingerprint
        """
        return secrets.token_hex(self.token_length // 2)

    def hash_token(self, token: str) -> str:
        """
        Hash a fingerprint token for secure storage.

        Args:
            token: The fingerprint token to hash

        Returns:
            Hashed token string
        """
        return hash_fingerprint(token)

    def verify_token(self, token: str, stored_hash: str) -> bool:
        """
        Verify a fingerprint token against a stored hash.

        Args:
            token: The fingerprint token to verify
            stored_hash: The stored hash to compare against

        Returns:
            True if tokens match, False otherwise
        """
        return verify_fingerprint(token, stored_hash)

    def verify_fingerprint(
        self, provided_token: str, stored_hash: str
    ) -> Tuple[bool, float]:
        """
        Verify a fingerprint and return match result with confidence.

        In real implementation, this would use the scanner SDK's
        matching algorithm which provides a match score.

        Args:
            provided_token: Token from the fingerprint scan
            stored_hash: Stored hash from enrollment

        Returns:
            Tuple of (is_match, confidence_score)
        """
        try:
            is_match = self.verify_token(provided_token, stored_hash)

            # In real implementation, the scanner SDK would provide
            # a match score. We simulate with 0.95 for match, 0.0 for no match.
            confidence = 0.95 if is_match else 0.0

            return (is_match, confidence)

        except Exception as e:
            logger.error(f"Fingerprint verification failed: {e}")
            return (False, 0.0)

    def enroll_fingerprint(self, token: str) -> str:
        """
        Enroll a fingerprint by hashing the token.

        Args:
            token: The fingerprint token from initial scan

        Returns:
            Hashed token for secure storage
        """
        return self.hash_token(token)

    def generate_demo_token_for_student(self, student_id: int, roll_no: str) -> str:
        """
        Generate a deterministic demo token for testing.

        This creates a predictable token based on student info,
        useful for demo/testing without actual hardware.

        Args:
            student_id: The student's ID
            roll_no: The student's roll number

        Returns:
            A deterministic token for the student
        """
        # Create deterministic token from student info
        seed = f"fingerprint_{student_id}_{roll_no}"
        return hashlib.sha256(seed.encode()).hexdigest()


# Singleton instance
fingerprint_service = FingerprintService()
