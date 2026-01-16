"""
Session management routes.
"""

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.session import Session
from app.models.course import Course
from app.models.user import User, UserRole
from app.schemas.session import (
    SessionCreate,
    SessionUpdate,
    SessionResponse,
    SessionListResponse,
    SessionActivate,
)
from app.auth.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post(
    "/create", response_model=SessionResponse, status_code=status.HTTP_201_CREATED
)
async def create_session(
    session_data: SessionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Create a new session for a course.
    Faculty can only create sessions for their own courses.
    """
    # Verify course exists
    result = await db.execute(select(Course).where(Course.id == session_data.course_id))
    course = result.scalar_one_or_none()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    # Faculty can only create sessions for their own courses
    if current_user.role == UserRole.FACULTY and course.faculty_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create sessions for your own courses",
        )

    # Create session
    session = Session(
        course_id=session_data.course_id,
        session_date=session_data.session_date,
        start_time=session_data.start_time,
        end_time=session_data.end_time,
        room_no=session_data.room_no,
        building=session_data.building,
        is_active=True,
    )

    db.add(session)
    await db.flush()
    await db.refresh(session)

    return SessionResponse(
        id=session.id,
        course_id=session.course_id,
        session_date=session.session_date,
        start_time=session.start_time,
        end_time=session.end_time,
        room_no=session.room_no,
        building=session.building,
        is_active=session.is_active,
        created_at=session.created_at,
        updated_at=session.updated_at,
        course_name=course.course_name,
        course_code=course.course_code,
    )


@router.get("/active", response_model=list[SessionResponse])
async def get_active_sessions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    course_id: Optional[int] = None,
):
    """
    Get all currently active sessions.
    """
    today = date.today()

    query = select(Session).where(
        and_(Session.is_active == True, Session.session_date == today)
    )

    if course_id:
        query = query.where(Session.course_id == course_id)

    result = await db.execute(query.order_by(Session.start_time))
    sessions = result.scalars().all()

    # Fetch course info for each session
    response_sessions = []
    for session in sessions:
        course_result = await db.execute(
            select(Course).where(Course.id == session.course_id)
        )
        course = course_result.scalar_one()

        response_sessions.append(
            SessionResponse(
                id=session.id,
                course_id=session.course_id,
                session_date=session.session_date,
                start_time=session.start_time,
                end_time=session.end_time,
                room_no=session.room_no,
                building=session.building,
                is_active=session.is_active,
                created_at=session.created_at,
                updated_at=session.updated_at,
                course_name=course.course_name,
                course_code=course.course_code,
            )
        )

    return response_sessions


@router.get("/", response_model=SessionListResponse)
async def list_sessions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    course_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
):
    """
    List sessions with optional filters.
    """
    query = select(Session)
    count_query = select(func.count(Session.id))

    conditions = []

    if course_id:
        conditions.append(Session.course_id == course_id)

    if start_date:
        conditions.append(Session.session_date >= start_date)

    if end_date:
        conditions.append(Session.session_date <= end_date)

    if is_active is not None:
        conditions.append(Session.is_active == is_active)

    if conditions:
        query = query.where(and_(*conditions))
        count_query = count_query.where(and_(*conditions))

    # Get total count
    total = (await db.execute(count_query)).scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    query = (
        query.offset(offset)
        .limit(page_size)
        .order_by(Session.session_date.desc(), Session.start_time.desc())
    )

    result = await db.execute(query)
    sessions = result.scalars().all()

    # Build response with course info
    response_sessions = []
    for session in sessions:
        course_result = await db.execute(
            select(Course).where(Course.id == session.course_id)
        )
        course = course_result.scalar_one()

        response_sessions.append(
            SessionResponse(
                id=session.id,
                course_id=session.course_id,
                session_date=session.session_date,
                start_time=session.start_time,
                end_time=session.end_time,
                room_no=session.room_no,
                building=session.building,
                is_active=session.is_active,
                created_at=session.created_at,
                updated_at=session.updated_at,
                course_name=course.course_name,
                course_code=course.course_code,
            )
        )

    return SessionListResponse(
        sessions=response_sessions,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get a specific session by ID.
    """
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    # Get course info
    course_result = await db.execute(
        select(Course).where(Course.id == session.course_id)
    )
    course = course_result.scalar_one()

    return SessionResponse(
        id=session.id,
        course_id=session.course_id,
        session_date=session.session_date,
        start_time=session.start_time,
        end_time=session.end_time,
        room_no=session.room_no,
        building=session.building,
        is_active=session.is_active,
        created_at=session.created_at,
        updated_at=session.updated_at,
        course_name=course.course_name,
        course_code=course.course_code,
    )


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Update a session.
    """
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    # Update fields
    update_data = session_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)

    await db.flush()
    await db.refresh(session)

    # Get course info
    course_result = await db.execute(
        select(Course).where(Course.id == session.course_id)
    )
    course = course_result.scalar_one()

    return SessionResponse(
        id=session.id,
        course_id=session.course_id,
        session_date=session.session_date,
        start_time=session.start_time,
        end_time=session.end_time,
        room_no=session.room_no,
        building=session.building,
        is_active=session.is_active,
        created_at=session.created_at,
        updated_at=session.updated_at,
        course_name=course.course_name,
        course_code=course.course_code,
    )


@router.post("/{session_id}/activate", response_model=SessionResponse)
async def activate_session(
    session_id: int,
    activate_data: SessionActivate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Activate or deactivate a session for attendance marking.
    """
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    session.is_active = activate_data.is_active
    await db.flush()
    await db.refresh(session)

    # Get course info
    course_result = await db.execute(
        select(Course).where(Course.id == session.course_id)
    )
    course = course_result.scalar_one()

    return SessionResponse(
        id=session.id,
        course_id=session.course_id,
        session_date=session.session_date,
        start_time=session.start_time,
        end_time=session.end_time,
        room_no=session.room_no,
        building=session.building,
        is_active=session.is_active,
        created_at=session.created_at,
        updated_at=session.updated_at,
        course_name=course.course_name,
        course_code=course.course_code,
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN]))],
):
    """
    Delete a session (Admin only).
    """
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    await db.delete(session)
    await db.flush()
