"""
Schemas package initialization.
"""

from app.schemas.auth import Token, TokenData, UserCreate, UserResponse, UserLogin
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentEnrollment,
)
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.schemas.session import SessionCreate, SessionUpdate, SessionResponse
from app.schemas.attendance import (
    AttendanceMarkRequest,
    AttendanceResponse,
    AttendanceVerificationResult,
)
from app.schemas.analytics import (
    AnalyticsSummary,
    StudentAttendanceStats,
    CourseAttendanceStats,
)
from app.schemas.anomaly import AnomalyLogResponse, AnomalyResolve

__all__ = [
    # Auth
    "Token",
    "TokenData",
    "UserCreate",
    "UserResponse",
    "UserLogin",
    # Student
    "StudentCreate",
    "StudentUpdate",
    "StudentResponse",
    "StudentEnrollment",
    # Course
    "CourseCreate",
    "CourseUpdate",
    "CourseResponse",
    # Session
    "SessionCreate",
    "SessionUpdate",
    "SessionResponse",
    # Attendance
    "AttendanceMarkRequest",
    "AttendanceResponse",
    "AttendanceVerificationResult",
    # Analytics
    "AnalyticsSummary",
    "StudentAttendanceStats",
    "CourseAttendanceStats",
    # Anomaly
    "AnomalyLogResponse",
    "AnomalyResolve",
]
