"""
Attendance model for tracking student attendance.
"""

import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Float, DateTime, func, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.session import Session


class AttendanceStatus(str, enum.Enum):
    """Attendance status options."""

    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class Attendance(Base):
    """
    Attendance model tracking individual attendance records.
    Each record represents one student's attendance for one session.
    """

    __tablename__ = "attendances"

    # Ensure one attendance record per student per session
    __table_args__ = (
        UniqueConstraint("student_id", "session_id", name="unique_student_session"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Foreign keys
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), nullable=False, index=True
    )
    session_id: Mapped[int] = mapped_column(
        ForeignKey("sessions.id"), nullable=False, index=True
    )

    # Attendance status
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.PRESENT
    )

    # Verification confidence scores (0.0 to 1.0)
    face_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    id_card_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fingerprint_match: Mapped[Optional[bool]] = mapped_column(nullable=True)

    # Overall verification score
    overall_confidence: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )

    # Verification method used
    verification_method: Mapped[str] = mapped_column(String(100), nullable=True)

    # When attendance was marked
    marked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # IP/Device info for audit
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    student: Mapped["Student"] = relationship(
        "Student", back_populates="attendances", lazy="selectin"
    )
    session: Mapped["Session"] = relationship(
        "Session", back_populates="attendances", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Attendance(id={self.id}, student_id={self.student_id}, status={self.status})>"
