"""
Analytics routes.
"""

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.analytics import (
    AnalyticsSummary,
    StudentAttendanceStats,
    CourseAttendanceStats,
    AttendanceTrend,
    AttendanceTrendsResponse,
    RiskReport,
)
from app.auth.dependencies import get_current_active_user, require_role
from app.services.analytics import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
    college_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    """
    Get overall analytics summary (Faculty/Admin only).

    Returns aggregated statistics including:
    - Total students, courses, sessions
    - Overall attendance percentage
    - Students at risk (low attendance)
    - Anomaly counts
    """
    return await analytics_service.get_summary(
        db=db, college_id=college_id, start_date=start_date, end_date=end_date
    )


@router.get("/student/{student_id}", response_model=StudentAttendanceStats)
async def get_student_analytics(
    student_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    """
    Get attendance statistics for a specific student.

    Students can only view their own stats.
    """
    # Students can only view their own stats
    if current_user.role == UserRole.STUDENT:
        if current_user.student_id != student_id:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own statistics",
            )

    stats = await analytics_service.get_student_stats(
        db=db, student_id=student_id, start_date=start_date, end_date=end_date
    )

    if not stats:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
        )

    return stats


@router.get("/course/{course_id}", response_model=CourseAttendanceStats)
async def get_course_analytics(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    """
    Get attendance statistics for a specific course (Faculty/Admin only).
    """
    stats = await analytics_service.get_course_stats(
        db=db, course_id=course_id, start_date=start_date, end_date=end_date
    )

    if not stats:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    return stats


@router.get("/trends", response_model=AttendanceTrendsResponse)
async def get_attendance_trends(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
    college_id: Optional[str] = None,
    days: int = 30,
):
    """
    Get daily attendance trends for the past N days (Faculty/Admin only).
    """
    from datetime import timedelta

    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    trends = await analytics_service.get_attendance_trends(
        db=db, college_id=college_id, days=days
    )

    return AttendanceTrendsResponse(
        trends=trends, period_start=start_date, period_end=end_date
    )


@router.get("/risk-report", response_model=RiskReport)
async def get_risk_report(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
    college_id: Optional[str] = None,
    threshold: float = 75.0,
):
    """
    Get students at risk of low attendance (Faculty/Admin only).

    Returns students whose attendance percentage is below the threshold.
    """
    from sqlalchemy import select
    from app.models.student import Student

    # Get all students
    query = select(Student)
    if college_id:
        query = query.where(Student.college_id == college_id)

    result = await db.execute(query)
    students = result.scalars().all()

    # Check each student's attendance
    at_risk_students = []
    for student in students:
        stats = await analytics_service.get_student_stats(db, student.id)
        if stats and stats.attendance_percentage < threshold:
            stats.risk_level = "high" if stats.attendance_percentage < 60 else "medium"
            at_risk_students.append(stats)

    # Sort by attendance percentage (lowest first)
    at_risk_students.sort(key=lambda s: s.attendance_percentage)

    return RiskReport(
        students=at_risk_students,
        total_at_risk=len(at_risk_students),
        threshold_percentage=threshold,
    )
