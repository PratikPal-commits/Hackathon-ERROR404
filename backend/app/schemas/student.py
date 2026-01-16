"""
Student schemas.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class StudentBase(BaseModel):
    """Base student schema with common fields."""

    roll_no: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    department: str = Field(..., min_length=1, max_length=100)
    college_id: str = Field(..., min_length=1, max_length=50)


class StudentCreate(StudentBase):
    """Student creation request schema."""

    pass


class StudentUpdate(BaseModel):
    """Student update request schema."""

    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    college_id: Optional[str] = Field(None, min_length=1, max_length=50)


class StudentResponse(StudentBase):
    """Student response schema."""

    id: int
    is_enrolled: bool
    has_face_data: bool = False
    has_fingerprint: bool = False
    has_id_card: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_biometrics(cls, student) -> "StudentResponse":
        """Create response with biometric status."""
        return cls(
            id=student.id,
            roll_no=student.roll_no,
            name=student.name,
            email=student.email,
            department=student.department,
            college_id=student.college_id,
            is_enrolled=student.is_enrolled,
            has_face_data=student.face_embedding is not None,
            has_fingerprint=student.fingerprint_hash is not None,
            has_id_card=student.id_card_data is not None,
            created_at=student.created_at,
            updated_at=student.updated_at,
        )


class StudentEnrollment(BaseModel):
    """Student biometric enrollment response."""

    student_id: int
    face_enrolled: bool = False
    fingerprint_enrolled: bool = False
    id_card_enrolled: bool = False
    message: str


class StudentListResponse(BaseModel):
    """Paginated student list response."""

    students: list[StudentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
