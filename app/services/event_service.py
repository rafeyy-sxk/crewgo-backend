"""Event service for fetching and personalizing events.

This module integrates with Eventbrite and Google Places APIs to fetch
events and provides personalized event recommendations based on user interests.
"""

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

import httpx
from supabase import Client

from app.config import settings
from app.core.exceptions import EventNotFoundException
from app.core.logging import get_logger
from app.db.client import get_supabase_client

logger = get_logger(__name__)


async def fetch_eventbrite_events(
    city: str = "Lahore", categories: Optional[List[str]] = None
) -> List[Dict]:
    """Fetch events from Eventbrite API.

    Args:
        city: City name to search events in
        categories: Optional list of category IDs to filter by

    Returns:
        List of event dictionaries mapped to internal schema
    """
    try:
        url = "https://www.eventbriteapi.com/v3/events/search/"
        params = {
            "location.address": city,
            "location.within": "50km",
            "status": "live",
            "order_by": "start_asc",
            "start_date.range_start": datetime.utcnow().isoformat() + "Z",
            "expand": "venue",
        }

        if categories:
            params["categories"] = ",".join(categories)

        headers = {"Authorization": f"Bearer {settings.eventbrite_api_key}"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

        events = []
        for event_data in data.get("events", [])[:50]:  # Limit to 50 events
            try:
                venue = event_data.get("venue", {})
                event = {
                    "external_id": f"eventbrite_{event_data.get('id')}",
                    "source": "eventbrite",
                    "title": event_data.get("name", {}).get("text", "Untitled Event"),
                    "description": event_data.get("description", {}).get("text", "")[
                        :1000
                    ],  # Limit description
                    "category": event_data.get("category_id", "general"),
                    "tags": [
                        cat.get("name", "")
                        for cat in event_data.get("categories", [])[:5]
                    ],
                    "venue_name": venue.get("name", ""),
                    "venue_address": venue.get("address", {}).get("localized_area_display", ""),
                    "city": city,
                    "latitude": Decimal(str(venue.get("latitude", 0)))
                    if venue.get("latitude")
                    else None,
                    "longitude": Decimal(str(venue.get("longitude", 0)))
                    if venue.get("longitude")
                    else None,
                    "start_datetime": datetime.fromisoformat(
                        event_data.get("start", {}).get("utc", "").replace("Z", "+00:00")
                    ),
                    "end_datetime": datetime.fromisoformat(
                        event_data.get("end", {}).get("utc", "").replace("Z", "+00:00")
                    )
                    if event_data.get("end", {}).get("utc")
                    else None,
                    "image_url": event_data.get("logo", {}).get("url", ""),
                    "ticket_url": event_data.get("url", ""),
                    "is_free": event_data.get("is_free", True),
                    "price_min": Decimal(str(event_data.get("ticket_availability", {}).get("minimum_ticket_price", {}).get("value", 0) / 100)))
                    if event_data.get("ticket_availability", {}).get("minimum_ticket_price", {}).get("value")
                    else None,
                    "price_max": Decimal(str(event_data.get("ticket_availability", {}).get("maximum_ticket_price", {}).get("value", 0) / 100)))
                    if event_data.get("ticket_availability", {}).get("maximum_ticket_price", {}).get("value")
                    else None,
                }
                events.append(event)
            except Exception as e:
                logger.warning(f"Error parsing Eventbrite event: {str(e)}")
                continue

        logger.info(f"Fetched {len(events)} events from Eventbrite for {city}")
        return events

    except Exception as e:
        logger.error(f"Error fetching Eventbrite events: {str(e)}")
        return []


async def fetch_google_places_events(city: str = "Lahore") -> List[Dict]:
    """Fetch events from Google Places API.

    Args:
        city: City name to search events in

    Returns:
        List of event dictionaries mapped to internal schema
    """
    try:
        # Google Places API - search for event venues
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params = {
            "query": f"events in {city}",
            "key": settings.google_places_api_key,
            "type": "establishment",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        events = []
        for place in data.get("results", [])[:20]:  # Limit to 20 places
            try:
                # Get place details for more info
                details_url = "https://maps.googleapis.com/maps/api/place/details/json"
                details_params = {
                    "place_id": place.get("place_id"),
                    "key": settings.google_places_api_key,
                    "fields": "name,formatted_address,geometry,types,photos",
                }

                details_response = await client.get(details_url, params=details_params)
                details_data = details_response.json().get("result", {})

                # Create a basic event entry (Google Places doesn't have event dates)
                # We'll use a placeholder date (next weekend)
                next_weekend = datetime.now() + timedelta(days=(5 - datetime.now().weekday()) % 7)

                event = {
                    "external_id": f"google_places_{place.get('place_id')}",
                    "source": "google_places",
                    "title": place.get("name", "Event Venue"),
                    "description": f"Event at {place.get('name', 'venue')}",
                    "category": place.get("types", ["establishment"])[0] if place.get("types") else "general",
                    "tags": place.get("types", [])[:5],
                    "venue_name": place.get("name", ""),
                    "venue_address": details_data.get("formatted_address", ""),
                    "city": city,
                    "latitude": Decimal(str(details_data.get("geometry", {}).get("location", {}).get("lat", 0)))
                    if details_data.get("geometry", {}).get("location", {}).get("lat")
                    else None,
                    "longitude": Decimal(str(details_data.get("geometry", {}).get("location", {}).get("lng", 0)))
                    if details_data.get("geometry", {}).get("location", {}).get("lng")
                    else None,
                    "start_datetime": next_weekend.replace(hour=18, minute=0, second=0, microsecond=0),
                    "end_datetime": next_weekend.replace(hour=22, minute=0, second=0, microsecond=0),
                    "image_url": f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={details_data.get('photos', [{}])[0].get('photo_reference', '')}&key={settings.google_places_api_key}"
                    if details_data.get("photos")
                    else None,
                    "ticket_url": None,
                    "is_free": True,
                    "price_min": None,
                    "price_max": None,
                }
                events.append(event)
            except Exception as e:
                logger.warning(f"Error parsing Google Places event: {str(e)}")
                continue

        logger.info(f"Fetched {len(events)} events from Google Places for {city}")
        return events

    except Exception as e:
        logger.error(f"Error fetching Google Places events: {str(e)}")
        return []


def get_vibe_score(user_interests: List[str], event_tags: List[str]) -> int:
    """Calculate vibe score (0-100) for user-event match.

    Args:
        user_interests: List of user interests
        event_tags: List of event tags

    Returns:
        Vibe score from 0 to 100
    """
    if not user_interests or not event_tags:
        return 0

    user_set = set(user_interests)
    event_set = set(event_tags)

    # Calculate overlap
    intersection = len(user_set.intersection(event_set))
    union = len(user_set.union(event_set))

    if union == 0:
        return 0

    # Convert to percentage (0-100)
    score = int((intersection / union) * 100)
    return min(score, 100)


async def get_personalized_events(
    user_id: UUID,
    limit: int = 10,
    supabase: Client = None,
) -> List[Dict]:
    """Get personalized event recommendations for a user.

    Args:
        user_id: User ID
        limit: Maximum number of events to return
        supabase: Optional Supabase client

    Returns:
        List of event dictionaries sorted by personalization score
    """
    if supabase is None:
        supabase = get_supabase_client()

    # Fetch user
    user_response = (
        supabase.table("users").select("*").eq("id", str(user_id)).execute()
    )
    if not user_response.data:
        return []
    user = user_response.data[0]

    user_interests = user.get("interests", [])
    user_city = user.get("city", settings.default_city)
    user_area = user.get("area")

    # Fetch upcoming events from database
    now = datetime.utcnow()
    events_response = (
        supabase.table("events")
        .select("*")
        .eq("city", user_city)
        .eq("is_active", True)
        .gte("start_datetime", now.isoformat())
        .order("start_datetime")
        .limit(100)  # Fetch more to score and filter
        .execute()
    )

    events = events_response.data

    # Score each event
    scored_events = []
    for event in events:
        score = 0.0

        # Category match with user interests (+0.4)
        event_category = event.get("category", "").lower()
        if any(interest.lower() in event_category for interest in user_interests):
            score += 0.4

        # Tags overlap (+0.3)
        event_tags = event.get("tags", [])
        if event_tags:
            overlap = get_vibe_score(user_interests, event_tags) / 100.0
            score += overlap * 0.3

        # Distance from user area (+0.2) - simplified
        event_area = event.get("venue_address", "").lower()
        if user_area and user_area.lower() in event_area:
            score += 0.2

        # Recency bonus - happening soon (+0.1)
        start_datetime = datetime.fromisoformat(event.get("start_datetime", "").replace("Z", "+00:00"))
        days_until = (start_datetime - now).days
        if days_until <= 7:
            score += 0.1
        elif days_until <= 14:
            score += 0.05

        scored_events.append({**event, "personalization_score": score})

    # Sort by score descending
    scored_events.sort(key=lambda x: x["personalization_score"], reverse=True)

    return scored_events[:limit]


async def sync_events_to_database(
    events: List[Dict], supabase: Client = None
) -> int:
    """Upsert events to database.

    Args:
        events: List of event dictionaries
        supabase: Optional Supabase client

    Returns:
        Number of events synced
    """
    if supabase is None:
        supabase = get_supabase_client()

    synced_count = 0
    for event in events:
        try:
            # Upsert by external_id
            external_id = event.get("external_id")
            if not external_id:
                continue

            # Convert Decimal to float for JSON serialization
            event_data = {**event}
            if event_data.get("latitude"):
                event_data["latitude"] = float(event_data["latitude"])
            if event_data.get("longitude"):
                event_data["longitude"] = float(event_data["longitude"])
            if event_data.get("price_min"):
                event_data["price_min"] = float(event_data["price_min"])
            if event_data.get("price_max"):
                event_data["price_max"] = float(event_data["price_max"])

            # Convert datetime to ISO string
            if isinstance(event_data.get("start_datetime"), datetime):
                event_data["start_datetime"] = event_data["start_datetime"].isoformat()
            if isinstance(event_data.get("end_datetime"), datetime):
                event_data["end_datetime"] = event_data["end_datetime"].isoformat()

            supabase.table("events").upsert(
                event_data, on_conflict="external_id"
            ).execute()
            synced_count += 1
        except Exception as e:
            logger.warning(f"Error syncing event {event.get('external_id')}: {str(e)}")
            continue

    logger.info(f"Synced {synced_count} events to database")
    return synced_count
