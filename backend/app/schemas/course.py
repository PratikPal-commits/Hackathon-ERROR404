"""
Course schemas.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CourseBase(BaseModel):
    """Base course schema with common fields."""

    course_code: str = Field(..., min_length=1, max_length=20)
    course_name: str = Field(..., min_length=2, max_length=255)
    department: str = Field(..., min_length=1, max_length=100)
    college_id: str = Field(..., min_length=1, max_length=50)
    semester: Optional[str] = Field(None, max_length=20)
    academic_year: Optional[str] = Field(None, max_length=20)


class CourseCreate(CourseBase):
    """Course creation request schema."""

    faculty_id: int


class CourseUpdate(BaseModel):
    """Course update request schema."""

    course_name: Optional[str] = Field(None, min_length=2, max_length=255)
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    faculty_id: Optional[int] = None
    semester: Optional[str] = Field(None, max_length=20)
    academic_year: Optional[str] = Field(None, max_length=20)


class CourseResponse(CourseBase):
    """Course response schema."""

    id: int
    faculty_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CourseListResponse(BaseModel):
    """Paginated course list response."""

    courses: list[CourseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
