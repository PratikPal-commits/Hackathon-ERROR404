"""
Attendance routes.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.attendance import AttendanceStatus
from app.schemas.attendance import (
    AttendanceMarkRequest,
    AttendanceResponse,
    AttendanceVerificationResult,
    AttendanceListResponse,
    AttendanceUpdateStatus,
    SessionAttendanceSummary,
)
from app.auth.dependencies import get_current_active_user, require_role
from app.services.attendance import attendance_service

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/mark", response_model=AttendanceVerificationResult)
async def mark_attendance(
    request: Request,
    attendance_data: AttendanceMarkRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Mark attendance with multi-factor verification.

    Provide biometric data for verification:
    - face_image: Base64 encoded face image
    - id_card_image: Base64 encoded ID card image
    - fingerprint_token: Fingerprint token from scanner

    At least one verification method is required.
    """
    # Get client IP
    client_ip = request.client.host if request.client else None

    # Students can only mark their own attendance
    if current_user.role == UserRole.STUDENT:
        if current_user.student_id != attendance_data.student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only mark your own attendance",
            )

    # Mark attendance with verification
    attendance, result = await attendance_service.mark_attendance(
        db=db, request=attendance_data, ip_address=client_ip
    )

    return result


@router.get("/student/{student_id}", response_model=AttendanceListResponse)
async def get_student_attendance(
    student_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = 1,
    page_size: int = 20,
):
    """
    Get attendance records for a student.
    Students can only view their own records.
    """
    # Students can only view their own attendance
    if current_user.role == UserRole.STUDENT:
        if current_user.student_id != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own attendance",
            )

    offset = (page - 1) * page_size
    attendances, total = await attendance_service.get_student_attendance(
        db=db, student_id=student_id, limit=page_size, offset=offset
    )

    return AttendanceListResponse(
        attendances=[
            AttendanceResponse(
                id=a.id,
                student_id=a.student_id,
                session_id=a.session_id,
                status=a.status,
                face_confidence=a.face_confidence,
                id_card_confidence=a.id_card_confidence,
                fingerprint_match=a.fingerprint_match,
                overall_confidence=a.overall_confidence,
                verification_method=a.verification_method,
                marked_at=a.marked_at,
                created_at=a.created_at,
                student_name=a.student.name if a.student else None,
                student_roll_no=a.student.roll_no if a.student else None,
            )
            for a in attendances
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/session/{session_id}", response_model=AttendanceListResponse)
async def get_session_attendance(
    session_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
    page: int = 1,
    page_size: int = 50,
):
    """
    Get all attendance records for a session (Faculty/Admin only).
    """
    offset = (page - 1) * page_size
    attendances, total = await attendance_service.get_session_attendance(
        db=db, session_id=session_id, limit=page_size, offset=offset
    )

    return AttendanceListResponse(
        attendances=[
            AttendanceResponse(
                id=a.id,
                student_id=a.student_id,
                session_id=a.session_id,
                status=a.status,
                face_confidence=a.face_confidence,
                id_card_confidence=a.id_card_confidence,
                fingerprint_match=a.fingerprint_match,
                overall_confidence=a.overall_confidence,
                verification_method=a.verification_method,
                marked_at=a.marked_at,
                created_at=a.created_at,
                student_name=a.student.name if a.student else None,
                student_roll_no=a.student.roll_no if a.student else None,
            )
            for a in attendances
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.patch("/{attendance_id}/status", response_model=AttendanceResponse)
async def update_attendance_status(
    attendance_id: int,
    status_update: AttendanceUpdateStatus,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Manually update attendance status (Faculty/Admin only).

    Use this for manual corrections, e.g., marking excused absence.
    """
    attendance = await attendance_service.update_attendance_status(
        db=db,
        attendance_id=attendance_id,
        status=status_update.status,
        updated_by=current_user.id,
    )

    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found"
        )

    return AttendanceResponse(
        id=attendance.id,
        student_id=attendance.student_id,
        session_id=attendance.session_id,
        status=attendance.status,
        face_confidence=attendance.face_confidence,
        id_card_confidence=attendance.id_card_confidence,
        fingerprint_match=attendance.fingerprint_match,
        overall_confidence=attendance.overall_confidence,
        verification_method=attendance.verification_method,
        marked_at=attendance.marked_at,
        created_at=attendance.created_at,
        student_name=attendance.student.name if attendance.student else None,
        student_roll_no=attendance.student.roll_no if attendance.student else None,
    )
