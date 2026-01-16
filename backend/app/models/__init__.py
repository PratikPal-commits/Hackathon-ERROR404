"""
Models package initialization.
Import all models here for Alembic to detect them.
"""

from app.models.user import User, UserRole
from app.models.student import Student
from app.models.course import Course
from app.models.session import Session
from app.models.attendance import Attendance, AttendanceStatus
from app.models.anomaly import AnomalyLog

__all__ = [
    "User",
    "UserRole",
    "Student",
    "Course",
    "Session",
    "Attendance",
    "AttendanceStatus",
    "AnomalyLog",
]
