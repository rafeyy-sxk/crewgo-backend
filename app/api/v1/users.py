"""User profile API endpoints.

This module provides endpoints for managing user profiles, interests,
FCM tokens, and account deletion.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.core.exceptions import UserNotFoundException
from app.core.logging import get_logger
from app.core.security import get_current_user
from app.db.client import get_supabase_client
from app.models.user import (
    FCMTokenUpdate,
    InterestsUpdate,
    UserPublic,
    UserResponse,
    UserUpdate,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile", response_model=UserResponse)
async def get_profile(
    current_user: dict = Depends(get_current_user),
):
    """Get current user's profile.

    Args:
        current_user: Current authenticated user

    Returns:
        User profile data
    """
    return UserResponse(**current_user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Update current user's profile.

    Args:
        update_data: Profile update data
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Updated user profile data
    """
    user_id = current_user["id"]

    # Prepare update data (exclude None values)
    update_dict = update_data.model_dump(exclude_unset=True)
    update_dict["updated_at"] = "now()"

    try:
        response = (
            supabase.table("users")
            .update(update_dict)
            .eq("id", user_id)
            .execute()
        )

        if not response.data:
            raise UserNotFoundException(str(user_id))

        logger.info(f"Updated profile for user {user_id}")
        return UserResponse(**response.data[0])

    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        )


@router.put("/interests", response_model=UserResponse)
async def update_interests(
    interests_data: InterestsUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Update user interests.

    Args:
        interests_data: Interests update data
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Updated user profile data
    """
    user_id = current_user["id"]

    try:
        response = (
            supabase.table("users")
            .update(
                {
                    "interests": interests_data.interests,
                    "updated_at": "now()",
                }
            )
            .eq("id", user_id)
            .execute()
        )

        if not response.data:
            raise UserNotFoundException(str(user_id))

        logger.info(f"Updated interests for user {user_id}")
        return UserResponse(**response.data[0])

    except Exception as e:
        logger.error(f"Error updating interests: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update interests",
        )


@router.put("/fcm-token", response_model=UserResponse)
async def update_fcm_token(
    token_data: FCMTokenUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Update user's FCM token for push notifications.

    Args:
        token_data: FCM token update data
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Updated user profile data
    """
    user_id = current_user["id"]

    try:
        response = (
            supabase.table("users")
            .update(
                {
                    "fcm_token": token_data.fcm_token,
                    "updated_at": "now()",
                }
            )
            .eq("id", user_id)
            .execute()
        )

        if not response.data:
            raise UserNotFoundException(str(user_id))

        logger.info(f"Updated FCM token for user {user_id}")
        return UserResponse(**response.data[0])

    except Exception as e:
        logger.error(f"Error updating FCM token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update FCM token",
        )


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: UUID,
    supabase: Client = Depends(get_supabase_client),
):
    """Get public user profile by ID.

    Args:
        user_id: User ID
        supabase: Supabase client

    Returns:
        Public user profile data

    Raises:
        HTTPException: If user not found
    """
    try:
        response = (
            supabase.table("users")
            .select("id, full_name, avatar_url, city, area, bio, interests")
            .eq("id", str(user_id))
            .eq("is_active", True)
            .execute()
        )

        if not response.data:
            raise UserNotFoundException(str(user_id))

        return UserPublic(**response.data[0])

    except UserNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user",
        )


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Delete current user's account.

    Args:
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        No content response
    """
    user_id = current_user["id"]

    try:
        # Soft delete: mark as inactive
        supabase.table("users").update({"is_active": False}).eq(
            "id", user_id
        ).execute()

        logger.info(f"Deleted account for user {user_id}")
        return None

    except Exception as e:
        logger.error(f"Error deleting account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account",
        )
