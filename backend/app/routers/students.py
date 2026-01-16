"""
Student management routes.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentEnrollment,
    StudentListResponse,
)
from app.auth.dependencies import get_current_active_user, require_role
from app.ml.face_recognition import face_recognition_service
from app.ml.fingerprint import fingerprint_service
from app.ml.id_validation import id_validation_service

router = APIRouter(prefix="/students", tags=["Students"])


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_data: StudentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Create a new student record.
    Only accessible by Admin and Faculty.
    """
    # Check if roll number already exists
    result = await db.execute(
        select(Student).where(Student.roll_no == student_data.roll_no)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student with this roll number already exists",
        )

    # Check if email already exists
    result = await db.execute(
        select(Student).where(Student.email == student_data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student with this email already exists",
        )

    # Create student
    student = Student(
        roll_no=student_data.roll_no,
        name=student_data.name,
        email=student_data.email,
        department=student_data.department,
        college_id=student_data.college_id,
        is_enrolled=False,
    )

    db.add(student)
    await db.flush()
    await db.refresh(student)

    return StudentResponse.from_orm_with_biometrics(student)


@router.get("/", response_model=StudentListResponse)
async def list_students(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    college_id: Optional[str] = None,
    department: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
):
    """
    List students with optional filters.
    """
    query = select(Student)
    count_query = select(func.count(Student.id))

    # Apply filters
    if college_id:
        query = query.where(Student.college_id == college_id)
        count_query = count_query.where(Student.college_id == college_id)

    if department:
        query = query.where(Student.department == department)
        count_query = count_query.where(Student.department == department)

    # Get total count
    total = (await db.execute(count_query)).scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Student.roll_no)

    result = await db.execute(query)
    students = result.scalars().all()

    return StudentListResponse(
        students=[StudentResponse.from_orm_with_biometrics(s) for s in students],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get a specific student by ID.
    """
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
        )

    return StudentResponse.from_orm_with_biometrics(student)


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    student_data: StudentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Update a student's information.
    """
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
        )

    # Update fields
    update_data = student_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    await db.flush()
    await db.refresh(student)

    return StudentResponse.from_orm_with_biometrics(student)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN]))],
):
    """
    Delete a student (Admin only).
    """
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
        )

    await db.delete(student)
    await db.flush()


@router.post("/{student_id}/enroll/face", response_model=StudentEnrollment)
async def enroll_face(
    student_id: int,
    face_image: str,  # Base64 encoded image
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Enroll a student's face for recognition.

    Body should contain base64 encoded face image.
    """
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
        )

    # Generate face embedding
    embedding = face_recognition_service.generate_embedding_from_base64(face_image)

    if embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not detect a face in the image. Please provide a clear face photo.",
        )

    # Store embedding
    student.face_embedding = face_recognition_service.serialize_embedding(embedding)

    # Update enrollment status
    _update_enrollment_status(student)

    await db.flush()
    await db.refresh(student)

    return StudentEnrollment(
        student_id=student.id,
        face_enrolled=True,
        fingerprint_enrolled=student.fingerprint_hash is not None,
        id_card_enrolled=student.id_card_data is not None,
        message="Face enrolled successfully",
    )


@router.post("/{student_id}/enroll/fingerprint", response_model=StudentEnrollment)
async def enroll_fingerprint(
    student_id: int,
    fingerprint_token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Enroll a student's fingerprint.

    In production, this would receive data from the fingerprint scanner.
    For demo, accepts a token string.
    """
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
        )

    # Hash and store fingerprint
    student.fingerprint_hash = fingerprint_service.enroll_fingerprint(fingerprint_token)

    # Update enrollment status
    _update_enrollment_status(student)

    await db.flush()
    await db.refresh(student)

    return StudentEnrollment(
        student_id=student.id,
        face_enrolled=student.face_embedding is not None,
        fingerprint_enrolled=True,
        id_card_enrolled=student.id_card_data is not None,
        message="Fingerprint enrolled successfully",
    )


@router.post("/{student_id}/enroll/id-card", response_model=StudentEnrollment)
async def enroll_id_card(
    student_id: int,
    id_card_image: str,  # Base64 encoded image
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_role([UserRole.ADMIN, UserRole.FACULTY]))
    ],
):
    """
    Enroll a student's ID card data.

    Extracts and stores information from ID card image.
    """
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
        )

    # Extract ID card data
    is_valid, confidence, extracted_data = id_validation_service.validate_id_card(
        id_card_image, student.roll_no, student.name
    )

    if not is_valid and confidence < 0.5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract valid data from ID card. Please provide a clearer image.",
        )

    # Store ID card data
    student.id_card_data = id_validation_service.serialize_id_data(extracted_data)

    # Update enrollment status
    _update_enrollment_status(student)

    await db.flush()
    await db.refresh(student)

    return StudentEnrollment(
        student_id=student.id,
        face_enrolled=student.face_embedding is not None,
        fingerprint_enrolled=student.fingerprint_hash is not None,
        id_card_enrolled=True,
        message=f"ID card enrolled with {confidence:.0%} confidence",
    )


@router.post(
    "/{student_id}/generate-demo-fingerprint", response_model=StudentEnrollment
)
async def generate_demo_fingerprint(
    student_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN]))],
):
    """
    Generate a demo fingerprint token for testing (Admin only).

    Returns the token that can be used for attendance marking.
    """
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
        )

    # Generate demo token
    demo_token = fingerprint_service.generate_demo_token_for_student(
        student.id, student.roll_no
    )

    # Enroll the fingerprint
    student.fingerprint_hash = fingerprint_service.enroll_fingerprint(demo_token)

    # Update enrollment status
    _update_enrollment_status(student)

    await db.flush()
    await db.refresh(student)

    return StudentEnrollment(
        student_id=student.id,
        face_enrolled=student.face_embedding is not None,
        fingerprint_enrolled=True,
        id_card_enrolled=student.id_card_data is not None,
        message=f"Demo fingerprint enrolled. Token: {demo_token}",
    )


def _update_enrollment_status(student: Student) -> None:
    """Update student's enrollment status based on biometric data."""
    # Consider enrolled if at least face OR fingerprint is registered
    student.is_enrolled = (
        student.face_embedding is not None or student.fingerprint_hash is not None
    )
