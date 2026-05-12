"""Crew chat API endpoints.

This module provides endpoints for sending and receiving crew chat messages,
including AI-generated prompts.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.exceptions import CrewNotFoundException
from app.core.logging import get_logger
from app.core.security import get_current_user
from app.db.client import get_supabase_client
from app.models.chat import ChatMessageCreate, ChatMessageListResponse, ChatMessageResponse
from app.services.ai_service import generate_daily_prompt
from app.services.claude_service import get_crew_ai_response
from pydantic import BaseModel

logger = get_logger(__name__)

router = APIRouter(prefix="/crews/{crew_id}/messages", tags=["chat"])


@router.get("", response_model=ChatMessageListResponse)
async def get_messages(
    crew_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get crew chat messages.

    Args:
        crew_id: Crew ID
        page: Page number (1-indexed)
        page_size: Number of messages per page
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Paginated list of chat messages

    Raises:
        HTTPException: If crew not found or user not a member
    """
    try:
        # Verify user is crew member
        member_check = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .eq("user_id", current_user["id"])
            .execute()
        )

        if not member_check.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this crew",
            )

        # Fetch messages
        offset = (page - 1) * page_size
        messages_response = (
            supabase.table("chat_messages")
            .select("*")
            .eq("crew_id", str(crew_id))
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        messages = messages_response.data

        # Fetch sender details
        sender_ids = [m["sender_id"] for m in messages if m.get("sender_id")]
        if sender_ids:
            users_response = (
                supabase.table("users")
                .select("id, full_name, avatar_url, city, area, bio, interests")
                .in_("id", sender_ids)
                .execute()
            )

            users_dict = {u["id"]: u for u in users_response.data}

            # Attach sender data to messages
            for message in messages:
                if message.get("sender_id") in users_dict:
                    from app.models.user import UserPublic

                    message["sender"] = UserPublic(**users_dict[message["sender_id"]])

        # Reverse to show oldest first
        messages.reverse()

        # Get total count
        count_response = (
            supabase.table("chat_messages")
            .select("id", count="exact")
            .eq("crew_id", str(crew_id))
            .execute()
        )
        total = (
            count_response.count if hasattr(count_response, "count") else len(messages)
        )

        return ChatMessageListResponse(
            messages=[ChatMessageResponse(**msg) for msg in messages],
            total=total,
            page=page,
            page_size=page_size,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch messages",
        )


@router.post("", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    crew_id: UUID,
    message_data: ChatMessageCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Send a chat message to crew.

    Args:
        crew_id: Crew ID
        message_data: Message data
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Created message

    Raises:
        HTTPException: If crew not found or user not a member
    """
    try:
        # Verify crew exists and user is member
        crew_response = (
            supabase.table("crews")
            .select("id")
            .eq("id", str(crew_id))
            .execute()
        )

        if not crew_response.data:
            raise CrewNotFoundException(str(crew_id))

        member_check = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .eq("user_id", current_user["id"])
            .execute()
        )

        if not member_check.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this crew",
            )

        # Create message
        message_dict = message_data.model_dump()
        message_dict["crew_id"] = str(crew_id)
        message_dict["sender_id"] = current_user["id"]

        response = supabase.table("chat_messages").insert(message_dict).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send message",
            )

        message = response.data[0]
        message["sender"] = {
            "id": current_user["id"],
            "full_name": current_user["full_name"],
            "avatar_url": current_user.get("avatar_url"),
        }

        logger.info(f"User {current_user['id']} sent message to crew {crew_id}")

        return ChatMessageResponse(**message)

    except (CrewNotFoundException, HTTPException):
        raise
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message",
        )


class AIMessageRequest(BaseModel):
    message: str


@router.post("/ai", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_ai_message(
    crew_id: UUID,
    body: AIMessageRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Send a message to CrewAI (Claude) and get a context-aware response.

    Claude receives full crew context: members, interests, event details,
    and recent chat history before generating a response.
    """
    try:
        # Verify membership
        member_check = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .eq("user_id", current_user["id"])
            .execute()
        )
        if not member_check.data:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

        # Fetch crew
        crew_resp = supabase.table("crews").select("*").eq("id", str(crew_id)).execute()
        if not crew_resp.data:
            raise CrewNotFoundException(str(crew_id))
        crew = crew_resp.data[0]

        # Fetch event
        event_resp = (
            supabase.table("events").select("*").eq("id", crew["event_id"]).execute()
        )
        event = event_resp.data[0] if event_resp.data else {}

        # Fetch crew members with interests
        members_resp = (
            supabase.table("crew_members")
            .select("user_id")
            .eq("crew_id", str(crew_id))
            .execute()
        )
        member_ids = [m["user_id"] for m in members_resp.data]
        users_resp = (
            supabase.table("users")
            .select("id, full_name, interests")
            .in_("id", member_ids)
            .execute()
        )
        members = users_resp.data or []

        # Fetch last 20 messages for context
        msgs_resp = (
            supabase.table("chat_messages")
            .select("content, sender_id, message_type")
            .eq("crew_id", str(crew_id))
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        recent = list(reversed(msgs_resp.data or []))
        # Attach sender names
        users_dict = {u["id"]: u["full_name"] for u in members}
        for msg in recent:
            msg["sender_name"] = users_dict.get(msg.get("sender_id"), "Member")
            msg["is_ai"] = msg.get("message_type") == "ai_message"

        # Store user's message first
        user_msg = {
            "crew_id": str(crew_id),
            "sender_id": current_user["id"],
            "message_type": "text",
            "content": body.message,
            "metadata": {},
        }
        supabase.table("chat_messages").insert(user_msg).execute()

        # Get Claude response
        ai_text = await get_crew_ai_response(
            user_message=body.message,
            crew=crew,
            event=event,
            members=members,
            recent_messages=recent,
        )

        # Store Claude's response
        ai_msg = {
            "crew_id": str(crew_id),
            "sender_id": None,
            "message_type": "ai_message",
            "content": ai_text,
            "metadata": {"model": "claude-opus-4-7"},
        }
        ai_resp = supabase.table("chat_messages").insert(ai_msg).execute()

        logger.info(f"Claude AI responded in crew {crew_id}")
        return ChatMessageResponse(**ai_resp.data[0])

    except (CrewNotFoundException, HTTPException):
        raise
    except Exception as e:
        logger.error(f"Claude AI error in crew {crew_id}: {e}")
        raise HTTPException(status_code=500, detail="AI assistant failed")


@router.post("/trigger-ai-prompt", response_model=ChatMessageResponse)
async def trigger_ai_prompt(
    crew_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Manually trigger an AI prompt for crew chat.

    Args:
        crew_id: Crew ID
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Created AI prompt message

    Raises:
        HTTPException: If crew not found or user not a member
    """
    try:
        # Verify crew exists and user is member
        crew_response = (
            supabase.table("crews")
            .select("*")
            .eq("id", str(crew_id))
            .execute()
        )

        if not crew_response.data:
            raise CrewNotFoundException(str(crew_id))

        crew = crew_response.data[0]

        member_check = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .eq("user_id", current_user["id"])
            .execute()
        )

        if not member_check.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this crew",
            )

        # Fetch event
        event_response = (
            supabase.table("events")
            .select("*")
            .eq("id", str(crew["event_id"]))
            .execute()
        )

        if not event_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found",
            )

        event = event_response.data[0]

        # Generate AI prompt
        prompt = await generate_daily_prompt(crew, event)

        # Create AI prompt message
        message_dict = {
            "crew_id": str(crew_id),
            "sender_id": None,  # System message
            "message_type": "ai_prompt",
            "content": prompt,
            "metadata": {},
        }

        response = supabase.table("chat_messages").insert(message_dict).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create AI prompt",
            )

        logger.info(f"AI prompt triggered for crew {crew_id}")

        return ChatMessageResponse(**response.data[0])

    except (CrewNotFoundException, HTTPException):
        raise
    except Exception as e:
        logger.error(f"Error triggering AI prompt: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger AI prompt",
        )
