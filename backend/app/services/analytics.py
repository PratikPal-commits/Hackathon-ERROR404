"""
Analytics service for attendance reporting.
"""

import logging
from datetime import date, datetime, timedelta
from typing import Optional, List

from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import Attendance, AttendanceStatus
from app.models.student import Student
from app.models.course import Course
from app.models.session import Session
from app.models.anomaly import AnomalyLog
from app.schemas.analytics import (
    AnalyticsSummary,
    StudentAttendanceStats,
    CourseAttendanceStats,
    AttendanceTrend,
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for attendance analytics and reporting."""

    def __init__(self):
        self.risk_threshold = (
            75.0  # Attendance percentage below which student is at risk
        )

    async def get_summary(
        self,
        db: AsyncSession,
        college_id: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> AnalyticsSummary:
        """
        Get overall analytics summary.

        Args:
            db: Database session
            college_id: Optional filter by college
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            AnalyticsSummary with overall statistics
        """
        # Base filters
        student_filter = []
        session_filter = []

        if college_id:
            student_filter.append(Student.college_id == college_id)

        if start_date:
            session_filter.append(Session.session_date >= start_date)
        if end_date:
            session_filter.append(Session.session_date <= end_date)

        # Count students
        student_query = select(func.count(Student.id))
        if student_filter:
            student_query = student_query.where(and_(*student_filter))
        total_students = (await db.execute(student_query)).scalar() or 0

        # Count courses
        course_query = select(func.count(Course.id))
        if college_id:
            course_query = course_query.where(Course.college_id == college_id)
        total_courses = (await db.execute(course_query)).scalar() or 0

        # Count sessions
        session_query = select(func.count(Session.id))
        if session_filter:
            session_query = session_query.where(and_(*session_filter))
        total_sessions = (await db.execute(session_query)).scalar() or 0

        # Count attendance records
        attendance_query = select(func.count(Attendance.id))
        if session_filter:
            attendance_query = attendance_query.join(Session).where(
                and_(*session_filter)
            )
        total_attendance = (await db.execute(attendance_query)).scalar() or 0

        # Calculate overall attendance percentage
        if total_sessions > 0 and total_students > 0:
            expected_attendance = total_sessions * total_students
            present_count_query = select(func.count(Attendance.id)).where(
                Attendance.status == AttendanceStatus.PRESENT
            )
            if session_filter:
                present_count_query = present_count_query.join(Session).where(
                    and_(*session_filter)
                )
            present_count = (await db.execute(present_count_query)).scalar() or 0
            overall_percentage = (
                (present_count / expected_attendance) * 100
                if expected_attendance > 0
                else 0
            )
        else:
            overall_percentage = 0.0

        # Count students at risk
        at_risk = await self._count_students_at_risk(
            db, college_id, start_date, end_date
        )

        # Count anomalies
        anomaly_query = select(func.count(AnomalyLog.id))
        total_anomalies = (await db.execute(anomaly_query)).scalar() or 0

        unresolved_query = select(func.count(AnomalyLog.id)).where(
            AnomalyLog.is_resolved == False
        )
        unresolved_anomalies = (await db.execute(unresolved_query)).scalar() or 0

        return AnalyticsSummary(
            total_students=total_students,
            total_courses=total_courses,
            total_sessions=total_sessions,
            total_attendance_records=total_attendance,
            overall_attendance_percentage=round(overall_percentage, 2),
            students_at_risk=at_risk,
            anomalies_detected=total_anomalies,
            anomalies_unresolved=unresolved_anomalies,
            period_start=start_date,
            period_end=end_date,
        )

    async def _count_students_at_risk(
        self,
        db: AsyncSession,
        college_id: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> int:
        """Count students with attendance below risk threshold."""
        # This is a simplified implementation
        # In production, you'd want a more efficient query

        student_query = select(Student)
        if college_id:
            student_query = student_query.where(Student.college_id == college_id)

        students = (await db.execute(student_query)).scalars().all()

        at_risk_count = 0
        for student in students:
            stats = await self.get_student_stats(db, student.id, start_date, end_date)
            if stats and stats.attendance_percentage < self.risk_threshold:
                at_risk_count += 1

        return at_risk_count

    async def get_student_stats(
        self,
        db: AsyncSession,
        student_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Optional[StudentAttendanceStats]:
        """Get attendance statistics for a student."""
        # Get student
        student = (
            await db.execute(select(Student).where(Student.id == student_id))
        ).scalar_one_or_none()

        if not student:
            return None

        # Build attendance query
        filters = [Attendance.student_id == student_id]
        if start_date or end_date:
            filters.append(Attendance.session_id == Session.id)
            if start_date:
                filters.append(Session.session_date >= start_date)
            if end_date:
                filters.append(Session.session_date <= end_date)

        # Get attendance counts by status
        status_counts = await db.execute(
            select(Attendance.status, func.count(Attendance.id))
            .where(and_(*filters))
            .group_by(Attendance.status)
        )

        counts = {status: count for status, count in status_counts}

        present = counts.get(AttendanceStatus.PRESENT, 0)
        absent = counts.get(AttendanceStatus.ABSENT, 0)
        late = counts.get(AttendanceStatus.LATE, 0)
        excused = counts.get(AttendanceStatus.EXCUSED, 0)

        total = present + absent + late + excused

        # Calculate attendance percentage (present + late count as attended)
        attended = present + late
        percentage = (attended / total * 100) if total > 0 else 0.0

        # Determine risk level
        if percentage < 60:
            risk_level = "high"
        elif percentage < self.risk_threshold:
            risk_level = "medium"
        else:
            risk_level = "normal"

        return StudentAttendanceStats(
            student_id=student.id,
            student_name=student.name,
            roll_no=student.roll_no,
            total_sessions=total,
            attended=attended,
            absent=absent,
            late=late,
            excused=excused,
            attendance_percentage=round(percentage, 2),
            risk_level=risk_level,
        )

    async def get_course_stats(
        self,
        db: AsyncSession,
        course_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Optional[CourseAttendanceStats]:
        """Get attendance statistics for a course."""
        # Get course
        course = (
            await db.execute(select(Course).where(Course.id == course_id))
        ).scalar_one_or_none()

        if not course:
            return None

        # Get sessions for this course
        session_filters = [Session.course_id == course_id]
        if start_date:
            session_filters.append(Session.session_date >= start_date)
        if end_date:
            session_filters.append(Session.session_date <= end_date)

        sessions = (
            (await db.execute(select(Session).where(and_(*session_filters))))
            .scalars()
            .all()
        )

        if not sessions:
            return CourseAttendanceStats(
                course_id=course.id,
                course_code=course.course_code,
                course_name=course.course_name,
                total_sessions=0,
                average_attendance=0.0,
                highest_attendance=0.0,
                lowest_attendance=0.0,
                total_students=0,
            )

        session_ids = [s.id for s in sessions]

        # Get attendance percentages per session
        percentages = []
        for session in sessions:
            # Count attendance for session
            result = await db.execute(
                select(func.count(Attendance.id)).where(
                    and_(
                        Attendance.session_id == session.id,
                        Attendance.status.in_(
                            [AttendanceStatus.PRESENT, AttendanceStatus.LATE]
                        ),
                    )
                )
            )
            present_count = result.scalar() or 0

            # Get total students (simplified - in production, use course enrollment)
            total_result = await db.execute(
                select(func.count(Attendance.id)).where(
                    Attendance.session_id == session.id
                )
            )
            total = total_result.scalar() or 0

            if total > 0:
                percentages.append(present_count / total * 100)

        # Get unique students who attended
        unique_students = (
            await db.execute(
                select(func.count(func.distinct(Attendance.student_id))).where(
                    Attendance.session_id.in_(session_ids)
                )
            )
        ).scalar() or 0

        return CourseAttendanceStats(
            course_id=course.id,
            course_code=course.course_code,
            course_name=course.course_name,
            total_sessions=len(sessions),
            average_attendance=round(sum(percentages) / len(percentages), 2)
            if percentages
            else 0.0,
            highest_attendance=round(max(percentages), 2) if percentages else 0.0,
            lowest_attendance=round(min(percentages), 2) if percentages else 0.0,
            total_students=unique_students,
        )

    async def get_attendance_trends(
        self, db: AsyncSession, college_id: Optional[str] = None, days: int = 30
    ) -> List[AttendanceTrend]:
        """Get daily attendance trends for the past N days."""
        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        trends = []
        current_date = start_date

        while current_date <= end_date:
            # Get sessions for this date
            session_query = select(Session).where(Session.session_date == current_date)
            sessions = (await db.execute(session_query)).scalars().all()

            if sessions:
                session_ids = [s.id for s in sessions]

                # Count present
                present_count = (
                    await db.execute(
                        select(func.count(Attendance.id)).where(
                            and_(
                                Attendance.session_id.in_(session_ids),
                                Attendance.status.in_(
                                    [AttendanceStatus.PRESENT, AttendanceStatus.LATE]
                                ),
                            )
                        )
                    )
                ).scalar() or 0

                # Count total
                total_count = (
                    await db.execute(
                        select(func.count(Attendance.id)).where(
                            Attendance.session_id.in_(session_ids)
                        )
                    )
                ).scalar() or 0

                percentage = (
                    (present_count / total_count * 100) if total_count > 0 else 0.0
                )

                trends.append(
                    AttendanceTrend(
                        date=current_date,
                        attendance_percentage=round(percentage, 2),
                        total_sessions=len(sessions),
                        total_present=present_count,
                    )
                )

            current_date += timedelta(days=1)

        return trends


# Singleton instance
analytics_service = AnalyticsService()
