"""
Attendance service for managing attendance records.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import Attendance, AttendanceStatus
from app.models.student import Student
from app.models.session import Session
from app.models.anomaly import AnomalyLog
from app.schemas.attendance import AttendanceMarkRequest, AttendanceVerificationResult
from app.services.verification import verification_service, VerificationResult

logger = logging.getLogger(__name__)


class AttendanceService:
    """Service for attendance-related operations."""

    async def get_student(self, db: AsyncSession, student_id: int) -> Optional[Student]:
        """Get student by ID."""
        result = await db.execute(select(Student).where(Student.id == student_id))
        return result.scalar_one_or_none()

    async def get_session(self, db: AsyncSession, session_id: int) -> Optional[Session]:
        """Get session by ID."""
        result = await db.execute(select(Session).where(Session.id == session_id))
        return result.scalar_one_or_none()

    async def check_existing_attendance(
        self, db: AsyncSession, student_id: int, session_id: int
    ) -> Optional[Attendance]:
        """Check if attendance already exists for student in session."""
        result = await db.execute(
            select(Attendance).where(
                and_(
                    Attendance.student_id == student_id,
                    Attendance.session_id == session_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def mark_attendance(
        self,
        db: AsyncSession,
        request: AttendanceMarkRequest,
        ip_address: Optional[str] = None,
    ) -> Tuple[Optional[Attendance], AttendanceVerificationResult]:
        """
        Mark attendance for a student with multi-factor verification.

        Args:
            db: Database session
            request: Attendance mark request with biometric data
            ip_address: Client IP address for audit

        Returns:
            Tuple of (Attendance record or None, VerificationResult)
        """
        # Get student
        student = await self.get_student(db, request.student_id)
        if not student:
            return None, AttendanceVerificationResult(
                success=False, message="Student not found"
            )

        # Get session
        session = await self.get_session(db, request.session_id)
        if not session:
            return None, AttendanceVerificationResult(
                success=False, message="Session not found"
            )

        # Check if session is active
        if not session.is_active:
            return None, AttendanceVerificationResult(
                success=False, message="Session is not active for attendance marking"
            )

        # Check if already marked
        existing = await self.check_existing_attendance(
            db, request.student_id, request.session_id
        )
        if existing:
            return None, AttendanceVerificationResult(
                success=False, message="Attendance already marked for this session"
            )

        # Check if student is enrolled (has biometrics)
        if not student.is_enrolled:
            return None, AttendanceVerificationResult(
                success=False,
                message="Student biometrics not enrolled. Please complete enrollment first.",
            )

        # Perform multi-factor verification
        verification_result = verification_service.verify_student(
            student_roll_no=student.roll_no,
            student_name=student.name,
            stored_face_embedding=student.face_embedding,
            stored_fingerprint_hash=student.fingerprint_hash,
            face_image_base64=request.face_image,
            id_card_image_base64=request.id_card_image,
            fingerprint_token=request.fingerprint_token,
        )

        # Create verification result schema
        result = AttendanceVerificationResult(
            success=verification_result.success,
            face_verified=verification_result.face_verified,
            face_confidence=verification_result.face_confidence,
            id_card_verified=verification_result.id_card_verified,
            id_card_confidence=verification_result.id_card_confidence,
            fingerprint_verified=verification_result.fingerprint_verified,
            overall_confidence=verification_result.overall_confidence,
            verification_method=verification_result.verification_method,
            message=verification_result.message,
            anomaly_detected=verification_result.anomaly_detected,
            anomaly_reason=verification_result.anomaly_reason,
        )

        # Log anomaly if detected
        if verification_result.anomaly_detected:
            await self._log_anomaly(
                db=db,
                student_id=student.id,
                session_id=session.id,
                anomaly_type="verification_failed",
                reason=verification_result.anomaly_reason or "Verification failed",
                ip_address=ip_address,
                device_info=request.device_info,
            )

        # Create attendance record if verification passed
        if verification_result.success:
            attendance = Attendance(
                student_id=student.id,
                session_id=session.id,
                status=AttendanceStatus.PRESENT,
                face_confidence=verification_result.face_confidence
                if verification_result.face_verified
                else None,
                id_card_confidence=verification_result.id_card_confidence
                if verification_result.id_card_verified
                else None,
                fingerprint_match=verification_result.fingerprint_verified,
                overall_confidence=verification_result.overall_confidence,
                verification_method=verification_result.verification_method,
                device_info=request.device_info,
                ip_address=ip_address,
                marked_at=datetime.now(timezone.utc),
            )

            db.add(attendance)
            await db.flush()
            await db.refresh(attendance)

            logger.info(
                f"Attendance marked for student {student.roll_no} "
                f"in session {session.id} with confidence {verification_result.overall_confidence:.2f}"
            )

            return attendance, result

        return None, result

    async def _log_anomaly(
        self,
        db: AsyncSession,
        student_id: int,
        session_id: int,
        anomaly_type: str,
        reason: str,
        severity: str = "medium",
        ip_address: Optional[str] = None,
        device_info: Optional[str] = None,
    ) -> AnomalyLog:
        """Log an anomaly to the database."""
        anomaly = AnomalyLog(
            student_id=student_id,
            session_id=session_id,
            anomaly_type=anomaly_type,
            severity=severity,
            reason=reason,
            ip_address=ip_address,
            device_info=device_info,
            attempt_time=datetime.now(timezone.utc),
        )
        db.add(anomaly)
        await db.flush()
        return anomaly

    async def get_student_attendance(
        self, db: AsyncSession, student_id: int, limit: int = 50, offset: int = 0
    ) -> Tuple[List[Attendance], int]:
        """Get attendance records for a student."""
        # Count total
        count_result = await db.execute(
            select(func.count(Attendance.id)).where(Attendance.student_id == student_id)
        )
        total = count_result.scalar()

        # Get records
        result = await db.execute(
            select(Attendance)
            .where(Attendance.student_id == student_id)
            .order_by(Attendance.marked_at.desc())
            .offset(offset)
            .limit(limit)
        )
        attendances = result.scalars().all()

        return list(attendances), total

    async def get_session_attendance(
        self, db: AsyncSession, session_id: int, limit: int = 100, offset: int = 0
    ) -> Tuple[List[Attendance], int]:
        """Get all attendance records for a session."""
        # Count total
        count_result = await db.execute(
            select(func.count(Attendance.id)).where(Attendance.session_id == session_id)
        )
        total = count_result.scalar()

        # Get records
        result = await db.execute(
            select(Attendance)
            .where(Attendance.session_id == session_id)
            .order_by(Attendance.marked_at.desc())
            .offset(offset)
            .limit(limit)
        )
        attendances = result.scalars().all()

        return list(attendances), total

    async def update_attendance_status(
        self,
        db: AsyncSession,
        attendance_id: int,
        status: AttendanceStatus,
        updated_by: int,
    ) -> Optional[Attendance]:
        """Update attendance status (manual correction)."""
        result = await db.execute(
            select(Attendance).where(Attendance.id == attendance_id)
        )
        attendance = result.scalar_one_or_none()

        if attendance:
            old_status = attendance.status
            attendance.status = status
            await db.flush()
            await db.refresh(attendance)

            logger.info(
                f"Attendance {attendance_id} status updated from {old_status} "
                f"to {status} by user {updated_by}"
            )

        return attendance


# Singleton instance
attendance_service = AttendanceService()
