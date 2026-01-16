"""
Session schemas.
"""

from datetime import datetime, date, time
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class SessionBase(BaseModel):
    """Base session schema with common fields."""

    course_id: int
    session_date: date
    start_time: time
    end_time: time
    room_no: Optional[str] = Field(None, max_length=50)
    building: Optional[str] = Field(None, max_length=100)

    @model_validator(mode="after")
    def validate_times(self):
        """Ensure end_time is after start_time."""
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class SessionCreate(SessionBase):
    """Session creation request schema."""

    pass


class SessionUpdate(BaseModel):
    """Session update request schema."""

    session_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room_no: Optional[str] = Field(None, max_length=50)
    building: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class SessionResponse(SessionBase):
    """Session response schema."""

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Optional: Include course info
    course_name: Optional[str] = None
    course_code: Optional[str] = None

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    """Paginated session list response."""

    sessions: list[SessionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SessionActivate(BaseModel):
    """Activate/deactivate session request."""

    is_active: bool
