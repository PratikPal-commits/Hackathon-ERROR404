"""
Authentication routes.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import Token, UserCreate, UserLogin, UserResponse
from app.auth.jwt import create_access_token, get_token_expiry_seconds
from app.auth.dependencies import get_current_active_user, require_role
from app.utils.hashing import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Annotated[AsyncSession, Depends(get_db)]):
    """
    Authenticate user and return JWT token.
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
        )

    # Create access token
    access_token = create_access_token(
        user_id=user.id, email=user.email, role=user.role
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=get_token_expiry_seconds(),
    )


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register(user_data: UserCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    """
    Register a new user.

    Note: In production, this should be restricted to admins
    or have additional verification steps.
    """
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user
    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        student_id=user_data.student_id,
        is_active=True,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.post("/logout")
async def logout(current_user: Annotated[User, Depends(get_current_active_user)]):
    """
    Logout the current user.

    Note: With JWT, logout is typically handled client-side by
    discarding the token. This endpoint is for any server-side
    cleanup if needed.
    """
    # In a more complex system, you might:
    # - Add token to a blacklist
    # - Clear refresh tokens
    # - Log the logout event

    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get current authenticated user's information.
    """
    return current_user


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role([UserRole.ADMIN]))],
)
async def create_user(
    user_data: UserCreate, db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Create a new user (Admin only).
    """
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user
    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        student_id=user_data.student_id,
        is_active=True,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user
