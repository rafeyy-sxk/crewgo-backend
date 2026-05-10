"""Authentication API endpoints.

This module provides endpoints for user registration, login, token refresh,
logout, and getting current user information.
"""

from datetime import datetime
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.core.exceptions import UnauthorizedException, UserNotFoundException
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    security,
    verify_password,
    verify_token,
)
from app.db.client import get_supabase_client
from app.models.user import UserResponse

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    """User registration request model."""

    email: EmailStr
    password: str
    full_name: str
    city: str = "Lahore"


class LoginRequest(BaseModel):
    """User login request model."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response model."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""

    refresh_token: str


class RefreshTokenResponse(BaseModel):
    """Refresh token response model."""

    access_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    supabase: Client = Depends(get_supabase_client),
):
    """Register a new user.

    Args:
        request: Registration request data
        supabase: Supabase client

    Returns:
        Token response with user data

    Raises:
        HTTPException: If email already exists
    """
    try:
        # Check if user already exists
        existing_user = (
            supabase.table("users")
            .select("id")
            .eq("email", request.email)
            .execute()
        )

        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Hash password
        hashed_password = hash_password(request.password)

        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up(
            {
                "email": request.email,
                "password": request.password,
            }
        )

        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account",
            )

        user_id = auth_response.user.id

        # Create user profile in database
        user_data = {
            "id": user_id,
            "email": request.email,
            "full_name": request.full_name,
            "city": request.city,
            "is_active": True,
            "is_verified": False,
        }

        user_response = supabase.table("users").insert(user_data).execute()

        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile",
            )

        user = user_response.data[0]

        # Generate tokens
        access_token = create_access_token(data={"sub": str(user_id)})
        refresh_token = create_refresh_token(data={"sub": str(user_id)})

        logger.info(f"User registered: {request.email}")

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(**user),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    supabase: Client = Depends(get_supabase_client),
):
    """Login user and return tokens.

    Args:
        request: Login request data
        supabase: Supabase client

    Returns:
        Token response with user data

    Raises:
        HTTPException: If credentials are invalid
    """
    try:
        # Authenticate with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password(
            {
                "email": request.email,
                "password": request.password,
            }
        )

        if not auth_response.user:
            raise UnauthorizedException("Invalid email or password")

        user_id = auth_response.user.id

        # Fetch user profile
        user_response = (
            supabase.table("users")
            .select("*")
            .eq("id", user_id)
            .execute()
        )

        if not user_response.data:
            raise UserNotFoundException(str(user_id))

        user = user_response.data[0]

        if not user.get("is_active", True):
            raise UnauthorizedException("User account is inactive")

        # Generate tokens
        access_token = create_access_token(data={"sub": str(user_id)})
        refresh_token = create_refresh_token(data={"sub": str(user_id)})

        logger.info(f"User logged in: {request.email}")

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(**user),
        )

    except (UnauthorizedException, UserNotFoundException):
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise UnauthorizedException("Invalid email or password")


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token.

    Args:
        request: Refresh token request data

    Returns:
        New access token

    Raises:
        HTTPException: If refresh token is invalid
    """
    try:
        payload = verify_token(request.refresh_token, token_type="refresh")
        user_id = payload.get("sub")

        if not user_id:
            raise UnauthorizedException("Invalid refresh token")

        # Generate new access token
        access_token = create_access_token(data={"sub": user_id})

        return RefreshTokenResponse(access_token=access_token)

    except UnauthorizedException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise UnauthorizedException("Invalid refresh token")


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
):
    """Logout user (invalidate tokens on client side).

    Args:
        credentials: HTTP Bearer token credentials
        supabase: Supabase client

    Returns:
        Success message
    """
    # In a stateless JWT system, logout is handled client-side
    # by discarding tokens. We can optionally blacklist tokens
    # in a database if needed for enhanced security.
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
):
    """Get current authenticated user information.

    Args:
        current_user: Current authenticated user (from dependency)

    Returns:
        User response data
    """
    return UserResponse(**current_user)
