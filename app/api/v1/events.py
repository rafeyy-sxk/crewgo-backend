"""Event discovery and personalization API endpoints.

This module provides endpoints for fetching personalized events,
expressing interest in events, and viewing event details.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.exceptions import EventNotFoundException
from app.core.logging import get_logger
from app.core.security import get_current_user, get_current_user_optional
from app.db.client import get_supabase_client
from app.models.event import EventInterestResponse, EventListResponse, EventResponse
from app.models.user import UserPublic
from app.services.event_service import (
    get_personalized_events,
    get_vibe_score,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=EventListResponse)
async def get_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user_optional),
    supabase: Client = Depends(get_supabase_client),
):
    """Get personalized event feed.

    Args:
        page: Page number (1-indexed)
        page_size: Number of events per page
        current_user: Optional current authenticated user
        supabase: Supabase client

    Returns:
        Paginated list of events
    """
    try:
        if current_user:
            # Personalized feed
            events = await get_personalized_events(
                UUID(current_user["id"]), limit=page_size * page, supabase=supabase
            )
            # Paginate
            start = (page - 1) * page_size
            end = start + page_size
            paginated_events = events[start:end]
        else:
            # Public feed (no personalization)
            offset = (page - 1) * page_size
            response = (
                supabase.table("events")
                .select("*")
                .eq("is_active", True)
                .order("start_datetime")
                .range(offset, offset + page_size - 1)
                .execute()
            )
            paginated_events = response.data

        # Get total count
        count_response = (
            supabase.table("events")
            .select("id", count="exact")
            .eq("is_active", True)
            .execute()
        )
        total = count_response.count if hasattr(count_response, "count") else len(paginated_events)

        return EventListResponse(
            events=[EventResponse(**event) for event in paginated_events],
            total=total,
            page=page,
            page_size=page_size,
        )

    except Exception as e:
        logger.error(f"Error fetching events: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch events",
        )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: UUID,
    supabase: Client = Depends(get_supabase_client),
):
    """Get single event details.

    Args:
        event_id: Event ID
        supabase: Supabase client

    Returns:
        Event details

    Raises:
        HTTPException: If event not found
    """
    try:
        response = (
            supabase.table("events")
            .select("*")
            .eq("id", str(event_id))
            .execute()
        )

        if not response.data:
            raise EventNotFoundException(str(event_id))

        return EventResponse(**response.data[0])

    except EventNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Error fetching event: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch event",
        )


@router.post("/{event_id}/interest", response_model=EventInterestResponse)
async def express_interest(
    event_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Express interest in an event.

    Args:
        event_id: Event ID
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Event interest record

    Raises:
        HTTPException: If event not found or already interested
    """
    try:
        # Check if event exists
        event_response = (
            supabase.table("events")
            .select("id")
            .eq("id", str(event_id))
            .execute()
        )

        if not event_response.data:
            raise EventNotFoundException(str(event_id))

        user_id = current_user["id"]

        # Check if already interested
        existing = (
            supabase.table("event_interests")
            .select("id")
            .eq("event_id", str(event_id))
            .eq("user_id", user_id)
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already expressed interest in this event",
            )

        # Create interest record
        response = (
            supabase.table("event_interests")
            .insert(
                {
                    "event_id": str(event_id),
                    "user_id": user_id,
                }
            )
            .execute()
        )

        logger.info(f"User {user_id} expressed interest in event {event_id}")
        return EventInterestResponse(**response.data[0])

    except (EventNotFoundException, HTTPException):
        raise
    except Exception as e:
        logger.error(f"Error expressing interest: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to express interest",
        )


@router.delete("/{event_id}/interest", status_code=status.HTTP_204_NO_CONTENT)
async def remove_interest(
    event_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Remove interest from an event.

    Args:
        event_id: Event ID
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        No content response
    """
    try:
        user_id = current_user["id"]

        supabase.table("event_interests").delete().eq(
            "event_id", str(event_id)
        ).eq("user_id", user_id).execute()

        logger.info(f"User {user_id} removed interest from event {event_id}")
        return None

    except Exception as e:
        logger.error(f"Error removing interest: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove interest",
        )


@router.get("/{event_id}/interested-users", response_model=List[UserPublic])
async def get_interested_users(
    event_id: UUID,
    supabase: Client = Depends(get_supabase_client),
):
    """Get list of users interested in an event.

    Args:
        event_id: Event ID
        supabase: Supabase client

    Returns:
        List of user public profiles
    """
    try:
        # Get user IDs interested in event
        interests_response = (
            supabase.table("event_interests")
            .select("user_id")
            .eq("event_id", str(event_id))
            .execute()
        )

        user_ids = [row["user_id"] for row in interests_response.data]

        if not user_ids:
            return []

        # Fetch user profiles
        users_response = (
            supabase.table("users")
            .select("id, full_name, avatar_url, city, area, bio, interests")
            .in_("id", user_ids)
            .eq("is_active", True)
            .execute()
        )

        return [UserPublic(**user) for user in users_response.data]

    except Exception as e:
        logger.error(f"Error fetching interested users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch interested users",
        )
