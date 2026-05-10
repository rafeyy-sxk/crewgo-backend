"""Event synchronization background tasks.

This module provides background tasks for syncing events from external
APIs and automatically forming crews.
"""

from datetime import datetime, timedelta

from app.core.logging import get_logger
from app.db.client import get_supabase_client
from app.services.event_service import (
    fetch_eventbrite_events,
    fetch_google_places_events,
    sync_events_to_database,
)
from app.services.matching_service import auto_form_crew

logger = get_logger(__name__)


async def sync_events_task() -> None:
    """Background task to sync events from Eventbrite and Google Places."""
    try:
        logger.info("Starting event sync task")

        # Fetch events from both sources
        eventbrite_events = await fetch_eventbrite_events(city="Lahore")
        google_places_events = await fetch_google_places_events(city="Lahore")

        # Combine and sync to database
        all_events = eventbrite_events + google_places_events
        synced_count = await sync_events_to_database(all_events)

        logger.info(f"Event sync completed: {synced_count} events synced")

    except Exception as e:
        logger.error(f"Error in event sync task: {str(e)}")


async def auto_form_crews_task() -> None:
    """Background task to automatically form crews for upcoming events."""
    try:
        logger.info("Starting auto crew formation task")

        supabase = get_supabase_client()

        # Find events happening in next 72 hours
        now = datetime.utcnow()
        future = now + timedelta(hours=72)

        events_response = (
            supabase.table("events")
            .select("id")
            .eq("is_active", True)
            .gte("start_datetime", now.isoformat())
            .lte("start_datetime", future.isoformat())
            .execute()
        )

        events = events_response.data
        logger.info(f"Found {len(events)} events in next 72 hours")

        # For each event, check if auto-formation is needed
        for event in events:
            try:
                # Count interested users
                interests_response = (
                    supabase.table("event_interests")
                    .select("user_id", count="exact")
                    .eq("event_id", event["id"])
                    .execute()
                )

                interested_count = (
                    interests_response.count
                    if hasattr(interests_response, "count")
                    else len(interests_response.data)
                )

                # Check if any crews already exist for this event
                crews_response = (
                    supabase.table("crews")
                    .select("id", count="exact")
                    .eq("event_id", event["id"])
                    .neq("status", "cancelled")
                    .execute()
                )

                existing_crews_count = (
                    crews_response.count
                    if hasattr(crews_response, "count")
                    else len(crews_response.data)
                )

                # Auto-form if 3+ interested users and no existing crews
                if interested_count >= 3 and existing_crews_count == 0:
                    logger.info(
                        f"Auto-forming crews for event {event['id']} with {interested_count} interested users"
                    )
                    crews = await auto_form_crew(event["id"], supabase=supabase)
                    logger.info(f"Auto-formed {len(crews)} crews for event {event['id']}")

            except Exception as e:
                logger.error(
                    f"Error auto-forming crews for event {event['id']}: {str(e)}"
                )
                continue

        logger.info("Auto crew formation task completed")

    except Exception as e:
        logger.error(f"Error in auto crew formation task: {str(e)}")
