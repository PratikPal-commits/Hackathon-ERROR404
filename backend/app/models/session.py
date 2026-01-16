"""
Session model for class sessions/lectures.
"""

from datetime import datetime, date, time
from typing import List, TYPE_CHECKING

from sqlalchemy import String, Date, Time, DateTime, func, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.attendance import Attendance
    from app.models.anomaly import AnomalyLog


class Session(Base):
    """
    Session model representing individual class sessions/lectures.
    Attendance is marked per session.
    """

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Course reference
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id"), nullable=False, index=True
    )

    # Session timing
    session_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    # Location
    room_no: Mapped[str] = mapped_column(String(50), nullable=True)
    building: Mapped[str] = mapped_column(String(100), nullable=True)

    # Session status
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True
    )  # Is attendance marking open?

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
    course: Mapped["Course"] = relationship(
        "Course", back_populates="sessions", lazy="selectin"
    )
    attendances: Mapped[List["Attendance"]] = relationship(
        "Attendance", back_populates="session", lazy="selectin"
    )
    anomaly_logs: Mapped[List["AnomalyLog"]] = relationship(
        "AnomalyLog", back_populates="session", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Session(id={self.id}, course_id={self.course_id}, date={self.session_date})>"
