"""
Anomaly detection and logging service.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.anomaly import AnomalyLog
from app.models.student import Student
from app.models.session import Session
from app.ml.face_recognition import face_recognition_service
from app.schemas.anomaly import AnomalyStats, AnomalyFilter

logger = logging.getLogger(__name__)


class AnomalyService:
    """
    Service for detecting and managing attendance anomalies.

    Detects:
    - Same face used for multiple roll numbers
    - Repeated failed authentication attempts
    - Unusual attendance timing patterns
    - Multiple attendance attempts from same IP
    """

    def __init__(self):
        self.max_failed_attempts = 3  # Max failed attempts before flagging
        self.attempt_window_minutes = 30  # Window for counting failed attempts

    async def log_anomaly(
        self,
        db: AsyncSession,
        anomaly_type: str,
        reason: str,
        student_id: Optional[int] = None,
        session_id: Optional[int] = None,
        severity: str = "medium",
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        device_info: Optional[str] = None,
    ) -> AnomalyLog:
        """
        Log a new anomaly.

        Args:
            db: Database session
            anomaly_type: Type of anomaly (e.g., "face_mismatch", "repeated_failure")
            reason: Human-readable reason
            student_id: Optional student ID
            session_id: Optional session ID
            severity: low, medium, high, critical
            details: Optional additional details as dict
            ip_address: Client IP address
            device_info: Device information

        Returns:
            Created AnomalyLog
        """
        anomaly = AnomalyLog(
            student_id=student_id,
            session_id=session_id,
            anomaly_type=anomaly_type,
            severity=severity,
            reason=reason,
            details=json.dumps(details) if details else None,
            ip_address=ip_address,
            device_info=device_info,
            attempt_time=datetime.now(timezone.utc),
        )

        db.add(anomaly)
        await db.flush()
        await db.refresh(anomaly)

        logger.warning(
            f"Anomaly logged: type={anomaly_type}, severity={severity}, "
            f"student_id={student_id}, reason={reason}"
        )

        return anomaly

    async def check_repeated_failures(
        self, db: AsyncSession, student_id: int, session_id: int
    ) -> bool:
        """
        Check if student has exceeded maximum failed attempts.

        Returns:
            True if threshold exceeded (should block)
        """
        window_start = datetime.now(timezone.utc) - timedelta(
            minutes=self.attempt_window_minutes
        )

        count = (
            await db.execute(
                select(func.count(AnomalyLog.id)).where(
                    and_(
                        AnomalyLog.student_id == student_id,
                        AnomalyLog.session_id == session_id,
                        AnomalyLog.anomaly_type == "verification_failed",
                        AnomalyLog.attempt_time >= window_start,
                    )
                )
            )
        ).scalar() or 0

        return count >= self.max_failed_attempts

    async def check_duplicate_face(
        self,
        db: AsyncSession,
        face_image_base64: str,
        claiming_student_id: int,
        college_id: str,
    ) -> Optional[int]:
        """
        Check if face matches a different student (proxy detection).

        Args:
            db: Database session
            face_image_base64: Face image to check
            claiming_student_id: Student ID claiming this face
            college_id: College ID to limit search scope

        Returns:
            Student ID if duplicate found, None otherwise
        """
        # Get all students with face embeddings from same college
        result = await db.execute(
            select(Student.id, Student.face_embedding).where(
                and_(
                    Student.college_id == college_id,
                    Student.face_embedding.isnot(None),
                    Student.id != claiming_student_id,
                )
            )
        )

        students = result.all()

        if not students:
            return None

        # Decode the face image
        face_image = face_recognition_service.decode_base64_image(face_image_base64)
        if face_image is None:
            return None

        # Check against each student
        embeddings = [(s.id, s.face_embedding) for s in students]
        match = face_recognition_service.find_matching_face(face_image, embeddings)

        if match:
            matched_student_id, confidence = match
            logger.warning(
                f"Duplicate face detected! Face matches student {matched_student_id} "
                f"but claimed by student {claiming_student_id} with confidence {confidence:.2f}"
            )
            return matched_student_id

        return None

    async def check_ip_anomaly(
        self, db: AsyncSession, ip_address: str, session_id: int, student_id: int
    ) -> bool:
        """
        Check if same IP was used by multiple students in same session.

        Returns:
            True if anomaly detected
        """
        # Count distinct students who used this IP for this session
        result = await db.execute(
            select(func.count(func.distinct(AnomalyLog.student_id))).where(
                and_(
                    AnomalyLog.ip_address == ip_address,
                    AnomalyLog.session_id == session_id,
                    AnomalyLog.student_id != student_id,
                )
            )
        )

        other_students = result.scalar() or 0

        return other_students > 0

    async def get_anomalies(
        self,
        db: AsyncSession,
        filters: Optional[AnomalyFilter] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[List[AnomalyLog], int, int, int, int]:
        """
        Get filtered list of anomalies.

        Returns:
            Tuple of (anomalies, total_count, unresolved_count, critical_count, high_count)
        """
        query = select(AnomalyLog)
        count_query = select(func.count(AnomalyLog.id))

        conditions = []

        if filters:
            if filters.student_id:
                conditions.append(AnomalyLog.student_id == filters.student_id)
            if filters.session_id:
                conditions.append(AnomalyLog.session_id == filters.session_id)
            if filters.anomaly_type:
                conditions.append(AnomalyLog.anomaly_type == filters.anomaly_type)
            if filters.severity:
                conditions.append(AnomalyLog.severity == filters.severity)
            if filters.is_resolved is not None:
                conditions.append(AnomalyLog.is_resolved == filters.is_resolved)
            if filters.start_date:
                conditions.append(AnomalyLog.attempt_time >= filters.start_date)
            if filters.end_date:
                conditions.append(AnomalyLog.attempt_time <= filters.end_date)

        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        # Get total count
        total = (await db.execute(count_query)).scalar() or 0

        # Get unresolved count
        unresolved = (
            await db.execute(
                select(func.count(AnomalyLog.id)).where(AnomalyLog.is_resolved == False)
            )
        ).scalar() or 0

        # Get critical count
        critical = (
            await db.execute(
                select(func.count(AnomalyLog.id)).where(
                    AnomalyLog.severity == "critical"
                )
            )
        ).scalar() or 0

        # Get high count
        high = (
            await db.execute(
                select(func.count(AnomalyLog.id)).where(AnomalyLog.severity == "high")
            )
        ).scalar() or 0

        # Get records with pagination
        query = (
            query.order_by(AnomalyLog.attempt_time.desc()).offset(offset).limit(limit)
        )
        result = await db.execute(query)
        anomalies = list(result.scalars().all())

        return anomalies, total, unresolved, critical, high

    async def resolve_anomaly(
        self, db: AsyncSession, anomaly_id: int, resolved_by: int, resolution_notes: str
    ) -> Optional[AnomalyLog]:
        """
        Mark an anomaly as resolved.

        Args:
            db: Database session
            anomaly_id: ID of anomaly to resolve
            resolved_by: User ID who resolved it
            resolution_notes: Notes about the resolution

        Returns:
            Updated AnomalyLog or None if not found
        """
        result = await db.execute(select(AnomalyLog).where(AnomalyLog.id == anomaly_id))
        anomaly = result.scalar_one_or_none()

        if anomaly:
            anomaly.is_resolved = True
            anomaly.resolved_by = resolved_by
            anomaly.resolution_notes = resolution_notes
            anomaly.resolved_at = datetime.now(timezone.utc)

            await db.flush()
            await db.refresh(anomaly)

            logger.info(f"Anomaly {anomaly_id} resolved by user {resolved_by}")

        return anomaly

    async def get_stats(self, db: AsyncSession) -> AnomalyStats:
        """Get anomaly statistics."""
        # Total
        total = (await db.execute(select(func.count(AnomalyLog.id)))).scalar() or 0

        # Unresolved
        unresolved = (
            await db.execute(
                select(func.count(AnomalyLog.id)).where(AnomalyLog.is_resolved == False)
            )
        ).scalar() or 0

        # By type
        type_result = await db.execute(
            select(AnomalyLog.anomaly_type, func.count(AnomalyLog.id)).group_by(
                AnomalyLog.anomaly_type
            )
        )
        by_type = {t: c for t, c in type_result}

        # By severity
        severity_result = await db.execute(
            select(AnomalyLog.severity, func.count(AnomalyLog.id)).group_by(
                AnomalyLog.severity
            )
        )
        by_severity = {s: c for s, c in severity_result}

        # Recent 24h
        yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
        recent = (
            await db.execute(
                select(func.count(AnomalyLog.id)).where(
                    AnomalyLog.attempt_time >= yesterday
                )
            )
        ).scalar() or 0

        return AnomalyStats(
            total_anomalies=total,
            unresolved=unresolved,
            resolved=total - unresolved,
            by_type=by_type,
            by_severity=by_severity,
            recent_24h=recent,
        )


# Singleton instance
anomaly_service = AnomalyService()
