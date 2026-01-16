"""
Course model for academic courses.
"""

from datetime import datetime
from typing import List, TYPE_CHECKING

from sqlalchemy import String, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.session import Session


class Course(Base):
    """Course model representing academic courses."""

    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    course_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    course_name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)

    # Faculty assigned to this course (references User.id)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # College/Campus identifier
    college_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Semester/Term info
    semester: Mapped[str] = mapped_column(String(20), nullable=True)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=True)

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
    sessions: Mapped[List["Session"]] = relationship(
        "Session", back_populates="course", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<Course(id={self.id}, code={self.course_code}, name={self.course_name})>"
        )
