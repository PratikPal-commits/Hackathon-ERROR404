"""
Anomaly Log model for tracking suspicious activities.
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.session import Session


class AnomalyLog(Base):
    """
    Anomaly Log model for tracking suspicious attendance activities.

    Examples of anomalies:
    - Same face used for multiple roll numbers
    - Repeated failed authentication attempts
    - Unusual attendance timing patterns
    - Location-based anomalies
    """

    __tablename__ = "anomaly_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # References (nullable as anomaly might not be linked to specific student/session)
    student_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("students.id"), nullable=True, index=True
    )
    session_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("sessions.id"), nullable=True, index=True
    )

    # Anomaly details
    anomaly_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(
        String(20), nullable=False, default="medium"
    )  # low, medium, high, critical
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    # Additional context (JSON string)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Resolution status
    is_resolved: Mapped[bool] = mapped_column(default=False)
    resolved_by: Mapped[Optional[int]] = mapped_column(
        nullable=True
    )  # User ID who resolved
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # When the anomaly occurred
    attempt_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Device/Network info for investigation
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

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
    student: Mapped[Optional["Student"]] = relationship(
        "Student", back_populates="anomaly_logs", lazy="selectin"
    )
    session: Mapped[Optional["Session"]] = relationship(
        "Session", back_populates="anomaly_logs", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<AnomalyLog(id={self.id}, type={self.anomaly_type}, severity={self.severity})>"
