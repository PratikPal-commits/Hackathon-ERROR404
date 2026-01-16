"""
Anomaly routes.
"""

from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.anomaly import (
    AnomalyLogResponse,
    AnomalyLogListResponse,
    AnomalyResolve,
    AnomalyStats,
    AnomalyFilter,
)
from app.auth.dependencies import get_current_active_user, require_role
from app.services.anomaly import anomaly_service

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])


@router.get("/logs", response_model=AnomalyLogListResponse)
async def get_anomaly_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
    student_id: Optional[int] = None,
    session_id: Optional[int] = None,
    anomaly_type: Optional[str] = None,
    severity: Optional[str] = None,
    is_resolved: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
):
    """
    Get anomaly logs with filters (Faculty/Admin only).
    """
    filters = AnomalyFilter(
        student_id=student_id,
        session_id=session_id,
        anomaly_type=anomaly_type,
        severity=severity,
        is_resolved=is_resolved,
    )

    offset = (page - 1) * page_size
    anomalies, total, unresolved, critical, high = await anomaly_service.get_anomalies(
        db=db, filters=filters, limit=page_size, offset=offset
    )

    return AnomalyLogListResponse(
        anomalies=[
            AnomalyLogResponse(
                id=a.id,
                student_id=a.student_id,
                session_id=a.session_id,
                anomaly_type=a.anomaly_type,
                severity=a.severity,
                reason=a.reason,
                details=a.details,
                is_resolved=a.is_resolved,
                resolved_by=a.resolved_by,
                resolution_notes=a.resolution_notes,
                resolved_at=a.resolved_at,
                attempt_time=a.attempt_time,
                ip_address=a.ip_address,
                device_info=a.device_info,
                created_at=a.created_at,
                student_name=a.student.name if a.student else None,
                student_roll_no=a.student.roll_no if a.student else None,
            )
            for a in anomalies
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
        total_unresolved=unresolved,
        critical_count=critical,
        high_count=high,
    )


@router.get("/stats", response_model=AnomalyStats)
async def get_anomaly_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Get anomaly statistics (Faculty/Admin only).
    """
    return await anomaly_service.get_stats(db)


@router.get("/{anomaly_id}", response_model=AnomalyLogResponse)
async def get_anomaly(
    anomaly_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Get a specific anomaly by ID (Faculty/Admin only).
    """
    from sqlalchemy import select
    from app.models.anomaly import AnomalyLog

    result = await db.execute(select(AnomalyLog).where(AnomalyLog.id == anomaly_id))
    anomaly = result.scalar_one_or_none()

    if not anomaly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found"
        )

    return AnomalyLogResponse(
        id=anomaly.id,
        student_id=anomaly.student_id,
        session_id=anomaly.session_id,
        anomaly_type=anomaly.anomaly_type,
        severity=anomaly.severity,
        reason=anomaly.reason,
        details=anomaly.details,
        is_resolved=anomaly.is_resolved,
        resolved_by=anomaly.resolved_by,
        resolution_notes=anomaly.resolution_notes,
        resolved_at=anomaly.resolved_at,
        attempt_time=anomaly.attempt_time,
        ip_address=anomaly.ip_address,
        device_info=anomaly.device_info,
        created_at=anomaly.created_at,
        student_name=anomaly.student.name if anomaly.student else None,
        student_roll_no=anomaly.student.roll_no if anomaly.student else None,
    )


@router.post("/{anomaly_id}/resolve", response_model=AnomalyLogResponse)
async def resolve_anomaly(
    anomaly_id: int,
    resolve_data: AnomalyResolve,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Mark an anomaly as resolved (Faculty/Admin only).
    """
    anomaly = await anomaly_service.resolve_anomaly(
        db=db,
        anomaly_id=anomaly_id,
        resolved_by=current_user.id,
        resolution_notes=resolve_data.resolution_notes,
    )

    if not anomaly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found"
        )

    return AnomalyLogResponse(
        id=anomaly.id,
        student_id=anomaly.student_id,
        session_id=anomaly.session_id,
        anomaly_type=anomaly.anomaly_type,
        severity=anomaly.severity,
        reason=anomaly.reason,
        details=anomaly.details,
        is_resolved=anomaly.is_resolved,
        resolved_by=anomaly.resolved_by,
        resolution_notes=anomaly.resolution_notes,
        resolved_at=anomaly.resolved_at,
        attempt_time=anomaly.attempt_time,
        ip_address=anomaly.ip_address,
        device_info=anomaly.device_info,
        created_at=anomaly.created_at,
        student_name=anomaly.student.name if anomaly.student else None,
        student_roll_no=anomaly.student.roll_no if anomaly.student else None,
    )
