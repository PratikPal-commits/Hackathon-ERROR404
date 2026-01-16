"""
Authentication dependencies for FastAPI routes.
"""

from typing import Annotated, List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.auth.jwt import verify_token
from app.schemas.auth import TokenData


# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Get the current authenticated user from the JWT token.

    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_data = verify_token(credentials.credentials)
    if token_data is None:
        raise credentials_exception

    # Get user from database
    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Get the current active user.

    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )
    return current_user


def require_role(allowed_roles: List[UserRole]):
    """
    Dependency factory to require specific roles.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(
            user: User = Depends(require_role([UserRole.ADMIN]))
        ):
            ...
    """

    async def role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker


# Common role dependencies
require_admin = require_role([UserRole.ADMIN])
require_faculty = require_role([UserRole.FACULTY, UserRole.ADMIN])
require_faculty_or_admin = require_role([UserRole.FACULTY, UserRole.ADMIN])
require_student = require_role([UserRole.STUDENT])


# Type aliases for cleaner route signatures
CurrentUser = Annotated[User, Depends(get_current_active_user)]
AdminUser = Annotated[User, Depends(require_admin)]
FacultyUser = Annotated[User, Depends(require_faculty)]
