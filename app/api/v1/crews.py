"""Crew management API endpoints.

This module provides endpoints for creating crews, joining crews,
managing crew members, and getting crew suggestions.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.core.exceptions import CrewFullException, CrewNotFoundException, EventNotFoundException
from app.core.logging import get_logger
from app.core.security import get_current_user
from app.db.client import get_supabase_client
from app.models.crew import (
    CrewCreate,
    CrewInviteRequest,
    CrewResponse,
    CrewStatusUpdate,
    CrewUpdate,
    SuggestedCrewResponse,
)
from app.services.ai_service import generate_crew_name, generate_icebreaker
from app.services.matching_service import suggest_crew_for_user

logger = get_logger(__name__)

router = APIRouter(prefix="/crews", tags=["crews"])


@router.post("", response_model=CrewResponse, status_code=status.HTTP_201_CREATED)
async def create_crew(
    crew_data: CrewCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Create a new crew for an event.

    Args:
        crew_data: Crew creation data
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Created crew data

    Raises:
        HTTPException: If event not found or user already in a crew for this event
    """
    try:
        # Verify event exists
        event_response = (
            supabase.table("events")
            .select("*")
            .eq("id", str(crew_data.event_id))
            .execute()
        )

        if not event_response.data:
            raise EventNotFoundException(str(crew_data.event_id))

        event = event_response.data[0]
        user_id = current_user["id"]

        # Check if user already in a crew for this event
        existing_crews_response = (
            supabase.table("crew_members")
            .select("crew_id")
            .eq("user_id", user_id)
            .execute()
        )

        if existing_crews_response.data:
            crew_ids = [cm["crew_id"] for cm in existing_crews_response.data]
            crews_response = (
                supabase.table("crews")
                .select("id")
                .in_("id", crew_ids)
                .eq("event_id", str(crew_data.event_id))
                .execute()
            )
            if crews_response.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Already in a crew for this event",
                )

        # Generate crew name if not provided
        crew_name = crew_data.name
        if not crew_name or crew_name == "":
            user_interests = current_user.get("interests", [])
            crew_name = await generate_crew_name(
                user_interests, event.get("category", "general")
            )

        # Create crew
        crew_dict = crew_data.model_dump()
        crew_dict["creator_id"] = user_id
        crew_dict["name"] = crew_name

        crew_response = supabase.table("crews").insert(crew_dict).execute()

        if not crew_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create crew",
            )

        crew = crew_response.data[0]

        # Add creator as confirmed member
        supabase.table("crew_members").insert(
            {
                "crew_id": crew["id"],
                "user_id": user_id,
                "status": "confirmed",
            }
        ).execute()

        # Generate icebreaker
        try:
            members_response = (
                supabase.table("crew_members")
                .select("user_id")
                .eq("crew_id", crew["id"])
                .execute()
            )
            member_ids = [m["user_id"] for m in members_response.data]

            users_response = (
                supabase.table("users")
                .select("*")
                .in_("id", member_ids)
                .execute()
            )

            icebreaker = await generate_icebreaker(users_response.data, event)
            supabase.table("crews").update({"ai_icebreaker": icebreaker}).eq(
                "id", crew["id"]
            ).execute()
        except Exception as e:
            logger.warning(f"Failed to generate icebreaker: {str(e)}")

        logger.info(f"Created crew {crew['id']} for event {crew_data.event_id}")
        return CrewResponse(**crew)

    except (EventNotFoundException, HTTPException):
        raise
    except Exception as e:
        logger.error(f"Error creating crew: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create crew",
        )


@router.get("/{crew_id}", response_model=CrewResponse)
async def get_crew(
    crew_id: UUID,
    supabase: Client = Depends(get_supabase_client),
):
    """Get crew details including members.

    Args:
        crew_id: Crew ID
        supabase: Supabase client

    Returns:
        Crew details with members

    Raises:
        HTTPException: If crew not found
    """
    try:
        crew_response = (
            supabase.table("crews")
            .select("*")
            .eq("id", str(crew_id))
            .execute()
        )

        if not crew_response.data:
            raise CrewNotFoundException(str(crew_id))

        crew = crew_response.data[0]

        # Fetch members
        members_response = (
            supabase.table("crew_members")
            .select("*")
            .eq("crew_id", str(crew_id))
            .execute()
        )

        # Fetch user details for members
        member_ids = [m["user_id"] for m in members_response.data]
        users_response = (
            supabase.table("users")
            .select("id, full_name, avatar_url, city, area, bio, interests")
            .in_("id", member_ids)
            .execute()
        )

        users_dict = {u["id"]: u for u in users_response.data}

        # Combine members with user data
        members = []
        for member in members_response.data:
            member_dict = {**member}
            if member["user_id"] in users_dict:
                member_dict["user"] = users_dict[member["user_id"]]
            members.append(member_dict)

        crew["members"] = members

        return CrewResponse(**crew)

    except CrewNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Error fetching crew: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch crew",
        )


@router.get("/my-crews", response_model=List[CrewResponse])
async def get_my_crews(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get current user's active crews.

    Args:
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        List of user's crews
    """
    try:
        user_id = current_user["id"]

        # Get crew IDs user is member of
        members_response = (
            supabase.table("crew_members")
            .select("crew_id")
            .eq("user_id", user_id)
            .execute()
        )

        crew_ids = [m["crew_id"] for m in members_response.data]

        if not crew_ids:
            return []

        # Fetch crews
        crews_response = (
            supabase.table("crews")
            .select("*")
            .in_("id", crew_ids)
            .neq("status", "cancelled")
            .order("created_at", desc=True)
            .execute()
        )

        return [CrewResponse(**crew) for crew in crews_response.data]

    except Exception as e:
        logger.error(f"Error fetching user crews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch crews",
        )


@router.post("/{crew_id}/join", response_model=CrewResponse)
async def join_crew(
    crew_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Join a crew.

    Args:
        crew_id: Crew ID
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Updated crew data

    Raises:
        HTTPException: If crew not found, full, or user already a member
    """
    try:
        # Get crew
        crew_response = (
            supabase.table("crews")
            .select("*")
            .eq("id", str(crew_id))
            .execute()
        )

        if not crew_response.data:
            raise CrewNotFoundException(str(crew_id))

        crew = crew_response.data[0]
        user_id = current_user["id"]

        # Check if crew is full
        members_response = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .execute()
        )

        current_member_count = len(members_response.data)
        if current_member_count >= crew.get("max_members", 6):
            raise CrewFullException(str(crew_id))

        # Check if already a member
        existing = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .eq("user_id", user_id)
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already a member of this crew",
            )

        # Add member
        supabase.table("crew_members").insert(
            {
                "crew_id": str(crew_id),
                "user_id": user_id,
                "status": "invited",
            }
        ).execute()

        logger.info(f"User {user_id} joined crew {crew_id}")

        # Return updated crew
        return await get_crew(crew_id, supabase)

    except (CrewNotFoundException, CrewFullException, HTTPException):
        raise
    except Exception as e:
        logger.error(f"Error joining crew: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join crew",
        )


@router.post("/{crew_id}/invite", response_model=CrewResponse)
async def invite_to_crew(
    crew_id: UUID,
    invite_data: CrewInviteRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Invite a user to a crew.

    Args:
        crew_id: Crew ID
        invite_data: Invite request data
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Updated crew data

    Raises:
        HTTPException: If crew not found, full, or user already invited
    """
    try:
        # Verify crew exists and user is creator/member
        crew_response = (
            supabase.table("crews")
            .select("*")
            .eq("id", str(crew_id))
            .execute()
        )

        if not crew_response.data:
            raise CrewNotFoundException(str(crew_id))

        crew = crew_response.data[0]
        user_id = current_user["id"]

        # Check permissions (creator or member can invite)
        member_check = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .eq("user_id", user_id)
            .execute()
        )

        if not member_check.data and crew.get("creator_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to invite to this crew",
            )

        # Check if crew is full
        members_response = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .execute()
        )

        if len(members_response.data) >= crew.get("max_members", 6):
            raise CrewFullException(str(crew_id))

        # Check if already a member
        existing = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .eq("user_id", str(invite_data.user_id))
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already a member of this crew",
            )

        # Add invite
        supabase.table("crew_members").insert(
            {
                "crew_id": str(crew_id),
                "user_id": str(invite_data.user_id),
                "status": "invited",
            }
        ).execute()

        logger.info(f"User {invite_data.user_id} invited to crew {crew_id}")

        return await get_crew(crew_id, supabase)

    except (CrewNotFoundException, CrewFullException, HTTPException):
        raise
    except Exception as e:
        logger.error(f"Error inviting to crew: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invite to crew",
        )


@router.put("/{crew_id}/status", response_model=CrewResponse)
async def update_crew_status(
    crew_id: UUID,
    status_data: CrewStatusUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Update crew member status (RSVP).

    Args:
        crew_id: Crew ID
        status_data: Status update data
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Updated crew data
    """
    try:
        user_id = current_user["id"]

        # Update member status
        supabase.table("crew_members").update(
            {"status": status_data.status}
        ).eq("crew_id", str(crew_id)).eq("user_id", user_id).execute()

        logger.info(
            f"User {user_id} updated status to {status_data.status} for crew {crew_id}"
        )

        return await get_crew(crew_id, supabase)

    except Exception as e:
        logger.error(f"Error updating crew status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update crew status",
        )


@router.post("/{crew_id}/complete", response_model=CrewResponse)
async def complete_crew(
    crew_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Mark a crew as completed.

    Args:
        crew_id: Crew ID
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Updated crew data

    Raises:
        HTTPException: If crew not found or user not authorized
    """
    try:
        # Verify crew exists and user is creator
        crew_response = (
            supabase.table("crews")
            .select("*")
            .eq("id", str(crew_id))
            .execute()
        )

        if not crew_response.data:
            raise CrewNotFoundException(str(crew_id))

        crew = crew_response.data[0]
        user_id = current_user["id"]

        if crew.get("creator_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only crew creator can mark crew as completed",
            )

        # Update crew status
        from datetime import datetime

        supabase.table("crews").update(
            {
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat(),
            }
        ).eq("id", str(crew_id)).execute()

        logger.info(f"Crew {crew_id} marked as completed")

        return await get_crew(crew_id, supabase)

    except (CrewNotFoundException, HTTPException):
        raise
    except Exception as e:
        logger.error(f"Error completing crew: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete crew",
        )


@router.get("/events/{event_id}/suggested-crew", response_model=SuggestedCrewResponse)
async def get_suggested_crew(
    event_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get AI-suggested crew members for an event.

    Args:
        event_id: Event ID
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Suggested crew members with compatibility scores
    """
    try:
        suggested_users = await suggest_crew_for_user(
            UUID(current_user["id"]), event_id, supabase=supabase
        )

        # Format response
        from app.models.user import UserPublic

        compatibility_scores = {
            str(u["id"]): u.get("compatibility_score", 0.0)
            for u in suggested_users
        }

        reasoning = f"Found {len(suggested_users)} compatible users based on shared interests and location."

        return SuggestedCrewResponse(
            suggested_users=[UserPublic(**u) for u in suggested_users],
            compatibility_scores=compatibility_scores,
            reasoning=reasoning,
        )

    except Exception as e:
        logger.error(f"Error getting suggested crew: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get suggested crew",
        )
