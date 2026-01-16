"""
JWT token handling.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.config import settings
from app.models.user import UserRole
from app.schemas.auth import TokenData


def create_access_token(
    user_id: int, email: str, role: UserRole, expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.

    Args:
        user_id: The user's ID
        email: The user's email
        role: The user's role
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode = {
        "sub": str(user_id),
        "email": email,
        "role": role.value,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )

    return encoded_jwt


def verify_token(token: str) -> Optional[TokenData]:
    """
    Verify and decode a JWT token.

    Args:
        token: The JWT token string

    Returns:
        TokenData if valid, None if invalid
    """
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )

        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role")
        exp = payload.get("exp")

        if user_id is None or email is None or role is None:
            return None

        return TokenData(
            user_id=int(user_id),
            email=email,
            role=UserRole(role),
            exp=datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None,
        )

    except JWTError:
        return None


def get_token_expiry_seconds() -> int:
    """Get the token expiry time in seconds."""
    return settings.access_token_expire_minutes * 60
