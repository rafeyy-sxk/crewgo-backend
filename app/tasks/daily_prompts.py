"""Daily AI prompt background tasks.

This module provides background tasks for sending daily AI prompts
to active crews and post-event reflection prompts.
"""

from datetime import datetime, timedelta

from app.core.logging import get_logger
from app.db.client import get_supabase_client
from app.services.ai_service import generate_daily_prompt, generate_post_event_reflection
from app.services.notification_service import send_to_crew

logger = get_logger(__name__)


async def send_daily_prompts_task() -> None:
    """Background task to send daily AI prompts to active crews with events today."""
    try:
        logger.info("Starting daily AI prompts task")

        supabase = get_supabase_client()
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        # Find crews with events today
        crews_response = (
            supabase.table("crews")
            .select("id, name, event_id")
            .in_("status", ["forming", "confirmed"])
            .execute()
        )

        # Fetch events for these crews
        event_ids = [crew["event_id"] for crew in crews_response.data if crew.get("event_id")]
        
        if not event_ids:
            logger.info("No crews with events found")
            return

        events_response = (
            supabase.table("events")
            .select("id, title, category, description, start_datetime")
            .in_("id", event_ids)
            .gte("start_datetime", today_start.isoformat())
            .lt("start_datetime", today_end.isoformat())
            .execute()
        )

        events_dict = {e["id"]: e for e in events_response.data}

        # Process each crew
        for crew in crews_response.data:
            if crew["event_id"] not in events_dict:
                continue

            try:
                event = events_dict[crew["event_id"]]

                # Generate prompt
                prompt = await generate_daily_prompt(crew, event)

                # Post to crew chat
                supabase.table("chat_messages").insert(
                    {
                        "crew_id": crew["id"],
                        "sender_id": None,
                        "message_type": "ai_prompt",
                        "content": prompt,
                        "metadata": {},
                    }
                ).execute()

                # Get crew member FCM tokens
                members_response = (
                    supabase.table("crew_members")
                    .select("user_id")
                    .eq("crew_id", crew["id"])
                    .execute()
                )

                member_ids = [m["user_id"] for m in members_response.data]

                if member_ids:
                    users_response = (
                        supabase.table("users")
                        .select("fcm_token")
                        .in_("id", member_ids)
                        .not_.is_("fcm_token", "null")
                        .execute()
                    )

                    fcm_tokens = [
                        u["fcm_token"]
                        for u in users_response.data
                        if u.get("fcm_token")
                    ]

                    # Send push notification
                    if fcm_tokens:
                        await send_to_crew(
                            fcm_tokens,
                            title=f"Daily Prompt: {crew['name']}",
                            body=prompt[:100] + "..." if len(prompt) > 100 else prompt,
                            data={"crew_id": crew["id"], "type": "ai_prompt"},
                        )

                logger.info(f"Sent daily prompt to crew {crew['id']}")

            except Exception as e:
                logger.error(f"Error sending prompt to crew {crew['id']}: {str(e)}")
                continue

        logger.info("Daily AI prompts task completed")

    except Exception as e:
        logger.error(f"Error in daily AI prompts task: {str(e)}")


async def send_post_event_reflections_task() -> None:
    """Background task to send post-event reflection prompts to crews whose events ended today."""
    try:
        logger.info("Starting post-event reflections task")

        supabase = get_supabase_client()
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        # Find crews with events that ended today
        crews_response = (
            supabase.table("crews")
            .select("id, name, event_id")
            .in_("status", ["confirmed", "completed"])
            .execute()
        )

        event_ids = [crew["event_id"] for crew in crews_response.data if crew.get("event_id")]
        
        if not event_ids:
            logger.info("No crews with events found")
            return

        events_response = (
            supabase.table("events")
            .select("id, title, category, description, end_datetime")
            .in_("id", event_ids)
            .gte("end_datetime", today_start.isoformat())
            .lt("end_datetime", today_end.isoformat())
            .execute()
        )

        events_dict = {e["id"]: e for e in events_response.data}

        # Process each crew
        for crew in crews_response.data:
            if crew["event_id"] not in events_dict:
                continue

            try:
                event = events_dict[crew["event_id"]]

                # Generate reflection prompt
                reflection = await generate_post_event_reflection(crew, event)

                # Post to crew chat
                supabase.table("chat_messages").insert(
                    {
                        "crew_id": crew["id"],
                        "sender_id": None,
                        "message_type": "ai_prompt",
                        "content": reflection,
                        "metadata": {"type": "post_event_reflection"},
                    }
                ).execute()

                # Trigger reel collection window (24 hours)
                # Update reel status if exists
                reels_response = (
                    supabase.table("reels")
                    .select("id")
                    .eq("crew_id", crew["id"])
                    .execute()
                )

                if reels_response.data:
                    # Reel exists, ensure it's in collecting status
                    supabase.table("reels").update({"status": "collecting"}).eq(
                        "id", reels_response.data[0]["id"]
                    ).execute()
                else:
                    # Create reel for collection
                    supabase.table("reels").insert(
                        {
                            "crew_id": crew["id"],
                            "event_id": crew["event_id"],
                            "status": "collecting",
                        }
                    ).execute()

                logger.info(f"Sent reflection prompt to crew {crew['id']}")

            except Exception as e:
                logger.error(
                    f"Error sending reflection to crew {crew['id']}: {str(e)}"
                )
                continue

        logger.info("Post-event reflections task completed")

    except Exception as e:
        logger.error(f"Error in post-event reflections task: {str(e)}")
