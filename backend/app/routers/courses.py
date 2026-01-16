"""
Course management routes.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.course import Course
from app.models.user import User, UserRole
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    CourseListResponse,
)
from app.auth.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course_data: CourseCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN]))],
):
    """
    Create a new course (Admin only).
    """
    # Check if course code already exists
    result = await db.execute(
        select(Course).where(Course.course_code == course_data.course_code)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course with this code already exists",
        )

    # Verify faculty exists
    from app.models.user import User as UserModel

    faculty = await db.execute(
        select(UserModel).where(
            UserModel.id == course_data.faculty_id,
            UserModel.role.in_([UserRole.FACULTY, UserRole.ADMIN]),
        )
    )
    if not faculty.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid faculty ID"
        )

    # Create course
    course = Course(
        course_code=course_data.course_code,
        course_name=course_data.course_name,
        department=course_data.department,
        faculty_id=course_data.faculty_id,
        college_id=course_data.college_id,
        semester=course_data.semester,
        academic_year=course_data.academic_year,
    )

    db.add(course)
    await db.flush()
    await db.refresh(course)

    return course


@router.get("/", response_model=CourseListResponse)
async def list_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    college_id: Optional[str] = None,
    department: Optional[str] = None,
    faculty_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
):
    """
    List courses with optional filters.
    """
    query = select(Course)
    count_query = select(func.count(Course.id))

    # Apply filters
    if college_id:
        query = query.where(Course.college_id == college_id)
        count_query = count_query.where(Course.college_id == college_id)

    if department:
        query = query.where(Course.department == department)
        count_query = count_query.where(Course.department == department)

    if faculty_id:
        query = query.where(Course.faculty_id == faculty_id)
        count_query = count_query.where(Course.faculty_id == faculty_id)

    # Get total count
    total = (await db.execute(count_query)).scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Course.course_code)

    result = await db.execute(query)
    courses = result.scalars().all()

    return CourseListResponse(
        courses=[CourseResponse.model_validate(c) for c in courses],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get a specific course by ID.
    """
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    return course


@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_data: CourseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN]))],
):
    """
    Update a course (Admin only).
    """
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    # Update fields
    update_data = course_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)

    await db.flush()
    await db.refresh(course)

    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN]))],
):
    """
    Delete a course (Admin only).
    """
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    await db.delete(course)
    await db.flush()
