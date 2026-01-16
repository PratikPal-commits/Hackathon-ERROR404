"""
Student model with biometric data storage.
"""

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Text, DateTime, func, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.attendance import Attendance
    from app.models.anomaly import AnomalyLog


class Student(Base):
    """
    Student model storing student information and biometric data.

    Note: Face embeddings are stored as binary (pickled numpy array).
    In production with pgvector, you would use Vector type instead.
    """

    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    roll_no: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)

    # College/Campus identifier for multi-campus support
    college_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Biometric data - stored securely
    # Face embedding stored as binary (128-dimensional vector from face_recognition)
    face_embedding: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)

    # Fingerprint hash (simulated - stored as hash, not raw data)
    fingerprint_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # ID card data extracted via OCR (JSON string)
    id_card_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status
    is_enrolled: Mapped[bool] = mapped_column(
        default=False
    )  # True when biometrics are registered

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
    attendances: Mapped[List["Attendance"]] = relationship(
        "Attendance", back_populates="student", lazy="selectin"
    )
    anomaly_logs: Mapped[List["AnomalyLog"]] = relationship(
        "AnomalyLog", back_populates="student", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Student(id={self.id}, roll_no={self.roll_no}, name={self.name})>"
