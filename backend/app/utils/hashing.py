"""
Password and fingerprint hashing utilities.
"""

import bcrypt


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to compare against

    Returns:
        True if password matches, False otherwise
    """
    try:
        password_bytes = plain_password.encode("utf-8")
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def hash_fingerprint(fingerprint_token: str) -> str:
    """
    Hash a fingerprint token.
    Uses the same bcrypt hashing as passwords for simplicity.

    In production with real fingerprint hardware, you would use
    a different approach specific to the fingerprint SDK.

    Args:
        fingerprint_token: The fingerprint token to hash

    Returns:
        Hashed fingerprint token
    """
    return hash_password(fingerprint_token)


def verify_fingerprint(token: str, hashed_token: str) -> bool:
    """
    Verify a fingerprint token against a hash.

    Args:
        token: The fingerprint token to verify
        hashed_token: The stored hashed token

    Returns:
        True if token matches, False otherwise
    """
    return verify_password(token, hashed_token)
