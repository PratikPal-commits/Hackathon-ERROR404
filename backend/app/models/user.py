"""
User model for authentication (Faculty, Admin, Students).
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserRole(str, enum.Enum):
    """User roles for role-based access control."""

    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"


class User(Base):
    """User model for authentication and authorization."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), nullable=False, default=UserRole.STUDENT
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # For linking to student record if role is STUDENT
    student_id: Mapped[Optional[int]] = mapped_column(nullable=True)

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

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
