"""
Authentication schemas.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class Token(BaseModel):
    """JWT Token response schema."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenData(BaseModel):
    """Token payload data."""

    user_id: int
    email: str
    role: UserRole
    exp: Optional[datetime] = None


class UserLogin(BaseModel):
    """User login request schema."""

    email: EmailStr
    password: str = Field(..., min_length=6)


class UserCreate(BaseModel):
    """User creation request schema."""

    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = UserRole.STUDENT
    student_id: Optional[int] = None  # Required if role is STUDENT


class UserResponse(BaseModel):
    """User response schema."""

    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    student_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """User update request schema."""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    is_active: Optional[bool] = None


class PasswordChange(BaseModel):
    """Password change request schema."""

    current_password: str
    new_password: str = Field(..., min_length=6)
