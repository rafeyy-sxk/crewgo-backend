"""Security utilities for JWT tokens and password hashing.

This module provides functions for creating and verifying JWT tokens,
hashing passwords with bcrypt, and FastAPI dependencies for authentication.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from supabase import Client

from app.config import settings
from app.core.exceptions import UnauthorizedException, UserNotFoundException
from app.core.logging import get_logger
from app.db.client import get_supabase_client

logger = get_logger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token scheme
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token.

    Args:
        data: Data to encode in token (typically user_id)
        expires_delta: Optional expiration delta. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token.

    Args:
        data: Data to encode in token (typically user_id)

    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> dict:
    """Verify and decode a JWT token.

    Args:
        token: JWT token string
        token_type: Expected token type ("access" or "refresh")

    Returns:
        Decoded token payload

    Raises:
        UnauthorizedException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        if payload.get("type") != token_type:
            raise UnauthorizedException("Invalid token type")
        return payload
    except JWTError as e:
        logger.warning(f"JWT verification failed: {str(e)}")
        raise UnauthorizedException("Invalid or expired token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """FastAPI dependency to get current authenticated user.

    Args:
        credentials: HTTP Bearer token credentials
        supabase: Supabase client instance

    Returns:
        User dictionary from database

    Raises:
        UnauthorizedException: If token is invalid or user not found
    """
    token = credentials.credentials
    payload = verify_token(token, token_type="access")
    user_id: str = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException("Token missing user ID")

    # Fetch user from database
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        if not response.data:
            raise UserNotFoundException(user_id)
        user = response.data[0]
        if not user.get("is_active", True):
            raise UnauthorizedException("User account is inactive")
        return user
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        if isinstance(e, (UnauthorizedException, UserNotFoundException)):
            raise
        raise UnauthorizedException("Failed to authenticate user")


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    supabase: Client = Depends(get_supabase_client),
) -> Optional[dict]:
    """FastAPI dependency to get current user if authenticated, None otherwise.

    Args:
        credentials: Optional HTTP Bearer token credentials
        supabase: Supabase client instance

    Returns:
        User dictionary if authenticated, None otherwise
    """
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, supabase)
    except Exception:
        return None
