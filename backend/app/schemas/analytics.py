"""
Analytics schemas.
"""

from datetime import date
from typing import Optional

from pydantic import BaseModel


class StudentAttendanceStats(BaseModel):
    """Attendance statistics for a student."""

    student_id: int
    student_name: str
    roll_no: str
    total_sessions: int
    attended: int
    absent: int
    late: int
    excused: int
    attendance_percentage: float
    risk_level: str = "normal"  # low, normal, high (for low attendance)


class CourseAttendanceStats(BaseModel):
    """Attendance statistics for a course."""

    course_id: int
    course_code: str
    course_name: str
    total_sessions: int
    average_attendance: float
    highest_attendance: float
    lowest_attendance: float
    total_students: int


class DepartmentStats(BaseModel):
    """Department-level statistics."""

    department: str
    total_students: int
    total_courses: int
    average_attendance: float
    students_at_risk: int  # Students with low attendance


class CollegeStats(BaseModel):
    """College-level statistics."""

    college_id: str
    total_students: int
    total_courses: int
    total_sessions: int
    average_attendance: float
    departments: list[DepartmentStats]


class AnalyticsSummary(BaseModel):
    """Overall analytics summary."""

    total_students: int
    total_courses: int
    total_sessions: int
    total_attendance_records: int
    overall_attendance_percentage: float
    students_at_risk: int
    anomalies_detected: int
    anomalies_unresolved: int

    # Optional time period
    period_start: Optional[date] = None
    period_end: Optional[date] = None


class AttendanceTrend(BaseModel):
    """Attendance trend data point."""

    date: date
    attendance_percentage: float
    total_sessions: int
    total_present: int


class AttendanceTrendsResponse(BaseModel):
    """Attendance trends over time."""

    trends: list[AttendanceTrend]
    period_start: date
    period_end: date


class RiskReport(BaseModel):
    """Students at risk report."""

    students: list[StudentAttendanceStats]
    total_at_risk: int
    threshold_percentage: float = 75.0
