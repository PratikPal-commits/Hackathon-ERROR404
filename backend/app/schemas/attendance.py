"""
Attendance schemas.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.attendance import AttendanceStatus


class AttendanceMarkRequest(BaseModel):
    """
    Request schema for marking attendance.
    Contains biometric data for verification.
    """

    session_id: int
    student_id: int

    # Face image as base64 encoded string
    face_image: Optional[str] = None

    # ID card image as base64 encoded string (for OCR)
    id_card_image: Optional[str] = None

    # Fingerprint token (simulated)
    fingerprint_token: Optional[str] = None

    # Device info for audit
    device_info: Optional[str] = Field(None, max_length=255)


class AttendanceVerificationResult(BaseModel):
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


class AttendanceResponse(BaseModel):
    """Attendance record response schema."""

    id: int
    student_id: int
    session_id: int
    status: AttendanceStatus
    face_confidence: Optional[float] = None
    id_card_confidence: Optional[float] = None
    fingerprint_match: Optional[bool] = None
    overall_confidence: float
    verification_method: Optional[str] = None
    marked_at: datetime
    created_at: datetime

    # Optional student info
    student_name: Optional[str] = None
    student_roll_no: Optional[str] = None

    model_config = {"from_attributes": True}


class AttendanceListResponse(BaseModel):
    """Paginated attendance list response."""

    attendances: list[AttendanceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AttendanceUpdateStatus(BaseModel):
    """Update attendance status (for manual correction by faculty)."""

    status: AttendanceStatus
    reason: Optional[str] = None


class SessionAttendanceSummary(BaseModel):
    """Summary of attendance for a session."""

    session_id: int
    total_students: int
    present: int
    absent: int
    late: int
    excused: int
    attendance_percentage: float
