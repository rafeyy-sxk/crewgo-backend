"""Crew matching algorithm service.

This module provides functions for matching users into crews based on
shared interests, location, and availability using pure Python algorithms.
"""

from typing import Dict, List, Tuple
from uuid import UUID

from supabase import Client

from app.core.exceptions import EventNotFoundException, UserNotFoundException
from app.core.logging import get_logger
from app.db.client import get_supabase_client

logger = get_logger(__name__)


def calculate_interest_overlap(
    user1_interests: List[str], user2_interests: List[str]
) -> float:
    """Calculate interest overlap score using Jaccard similarity.

    Args:
        user1_interests: List of user 1's interests
        user2_interests: List of user 2's interests

    Returns:
        Overlap score between 0.0 and 1.0
    """
    if not user1_interests or not user2_interests:
        return 0.0

    # Convert to sets for Jaccard similarity
    set1 = set(user1_interests)
    set2 = set(user2_interests)

    # Jaccard similarity: intersection / union
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))

    if union == 0:
        return 0.0

    return intersection / union


def calculate_compatibility_score(
    user1: Dict,
    user2: Dict,
    event: Dict,
    interest_overlap: float,
) -> float:
    """Calculate overall compatibility score between two users for an event.

    Args:
        user1: User 1 dictionary
        user2: User 2 dictionary
        event: Event dictionary
        interest_overlap: Pre-calculated interest overlap score

    Returns:
        Compatibility score (higher is better)
    """
    score = interest_overlap

    # Same area bonus (+0.2)
    if user1.get("area") and user2.get("area"):
        if user1["area"].lower() == user2["area"].lower():
            score += 0.2

    # Same city bonus (already assumed, but ensure)
    if user1.get("city") == user2.get("city"):
        score += 0.05

    # Availability match bonus (+0.1)
    user1_availability = set(user1.get("availability", []))
    user2_availability = set(user2.get("availability", []))
    if user1_availability and user2_availability:
        if user1_availability.intersection(user2_availability):
            score += 0.1

    # Cap at 1.0
    return min(score, 1.0)


async def find_compatible_users(
    user_id: UUID,
    event_id: UUID,
    limit: int = 10,
    supabase: Client = None,
) -> List[Dict]:
    """Find compatible users for a given user and event.

    Args:
        user_id: Current user ID
        event_id: Event ID
        limit: Maximum number of users to return
        supabase: Optional Supabase client (uses singleton if not provided)

    Returns:
        List of compatible user dictionaries sorted by compatibility score

    Raises:
        UserNotFoundException: If user not found
        EventNotFoundException: If event not found
    """
    if supabase is None:
        supabase = get_supabase_client()

    # Fetch current user
    user_response = (
        supabase.table("users").select("*").eq("id", str(user_id)).execute()
    )
    if not user_response.data:
        raise UserNotFoundException(str(user_id))
    current_user = user_response.data[0]

    # Fetch event
    event_response = (
        supabase.table("events").select("*").eq("id", str(event_id)).execute()
    )
    if not event_response.data:
        raise EventNotFoundException(str(event_id))
    event = event_response.data[0]

    # Find users interested in the same event (excluding current user)
    interests_response = (
        supabase.table("event_interests")
        .select("user_id")
        .eq("event_id", str(event_id))
        .neq("user_id", str(user_id))
        .execute()
    )

    interested_user_ids = [row["user_id"] for row in interests_response.data]

    if not interested_user_ids:
        return []

    # Fetch user details for interested users
    users_response = (
        supabase.table("users")
        .select("*")
        .in_("id", interested_user_ids)
        .eq("is_active", True)
        .execute()
    )

    # Calculate compatibility scores
    compatible_users = []
    current_interests = current_user.get("interests", [])

    for user in users_response.data:
        # Skip users already in a crew for this event
        crew_members_response = (
            supabase.table("crew_members")
            .select("crew_id")
            .eq("user_id", user["id"])
            .execute()
        )
        crew_ids = [cm["crew_id"] for cm in crew_members_response.data]

        if crew_ids:
            crews_response = (
                supabase.table("crews")
                .select("id")
                .in_("id", crew_ids)
                .eq("event_id", str(event_id))
                .execute()
            )
            if crews_response.data:
                continue  # User already in a crew for this event

        # Calculate compatibility
        user_interests = user.get("interests", [])
        interest_overlap = calculate_interest_overlap(
            current_interests, user_interests
        )
        compatibility_score = calculate_compatibility_score(
            current_user, user, event, interest_overlap
        )

        compatible_users.append(
            {
                **user,
                "compatibility_score": compatibility_score,
                "interest_overlap": interest_overlap,
            }
        )

    # Sort by compatibility score (descending)
    compatible_users.sort(key=lambda x: x["compatibility_score"], reverse=True)

    return compatible_users[:limit]


async def suggest_crew_for_user(
    user_id: UUID,
    event_id: UUID,
    supabase: Client = None,
) -> List[Dict]:
    """Suggest top 5 most compatible users for a crew.

    Args:
        user_id: Current user ID
        event_id: Event ID
        supabase: Optional Supabase client

    Returns:
        List of top 5 compatible user dictionaries
    """
    compatible_users = await find_compatible_users(
        user_id, event_id, limit=5, supabase=supabase
    )
    return compatible_users


async def auto_form_crew(event_id: UUID, supabase: Client = None) -> List[Dict]:
    """Automatically form crews for an event with 3+ interested users.

    Groups users into crews of max 6 by compatibility score. Only runs
    when 3+ users are interested in the same event.

    Args:
        event_id: Event ID
        supabase: Optional Supabase client

    Returns:
        List of created crew dictionaries

    Raises:
        EventNotFoundException: If event not found
    """
    if supabase is None:
        supabase = get_supabase_client()

    # Fetch event
    event_response = (
        supabase.table("events").select("*").eq("id", str(event_id)).execute()
    )
    if not event_response.data:
        raise EventNotFoundException(str(event_id))
    event = event_response.data[0]

    # Find all users interested in this event
    interests_response = (
        supabase.table("event_interests")
        .select("user_id")
        .eq("event_id", str(event_id))
        .execute()
    )

    interested_user_ids = [row["user_id"] for row in interests_response.data]

    if len(interested_user_ids) < 3:
        logger.info(
            f"Not enough users ({len(interested_user_ids)}) interested in event {event_id} to form crew"
        )
        return []

    # Fetch user details
    users_response = (
        supabase.table("users")
        .select("*")
        .in_("id", interested_user_ids)
        .eq("is_active", True)
        .execute()
    )

    users = users_response.data

    # Filter out users already in a crew for this event
    crew_members_response = (
        supabase.table("crew_members")
        .select("crew_id, user_id")
        .in_("user_id", interested_user_ids)
        .execute()
    )
    existing_crew_user_ids = set(cm["user_id"] for cm in crew_members_response.data)

    if existing_crew_user_ids:
        existing_crew_ids = [cm["crew_id"] for cm in crew_members_response.data]
        crews_response = (
            supabase.table("crews")
            .select("id")
            .in_("id", existing_crew_ids)
            .eq("event_id", str(event_id))
            .execute()
        )
        existing_crew_ids_for_event = set(c["id"] for c in crews_response.data)
        users_in_crews = set(
            cm["user_id"]
            for cm in crew_members_response.data
            if cm["crew_id"] in existing_crew_ids_for_event
        )
        users = [u for u in users if u["id"] not in users_in_crews]

    if len(users) < 3:
        logger.info(
            f"Not enough available users ({len(users)}) for event {event_id} after filtering"
        )
        return []

    # Calculate pairwise compatibility scores
    compatibility_matrix: Dict[Tuple[str, str], float] = {}
    for i, user1 in enumerate(users):
        for j, user2 in enumerate(users[i + 1 :], start=i + 1):
            interest_overlap = calculate_interest_overlap(
                user1.get("interests", []), user2.get("interests", [])
            )
            score = calculate_compatibility_score(user1, user2, event, interest_overlap)
            compatibility_matrix[(user1["id"], user2["id"])] = score

    # Simple greedy grouping algorithm
    # Group users by compatibility scores
    crews = []
    used_user_ids = set()
    max_crew_size = 6

    # Sort users by total compatibility with others
    user_scores = {}
    for user in users:
        total_score = sum(
            compatibility_matrix.get((user["id"], u["id"]), 0)
            + compatibility_matrix.get((u["id"], user["id"]), 0)
            for u in users
            if u["id"] != user["id"]
        )
        user_scores[user["id"]] = total_score

    sorted_users = sorted(users, key=lambda u: user_scores.get(u["id"], 0), reverse=True)

    for user in sorted_users:
        if user["id"] in used_user_ids:
            continue

        # Start a new crew with this user
        crew_members = [user]
        used_user_ids.add(user["id"])

        # Find compatible users to add
        for candidate in sorted_users:
            if candidate["id"] in used_user_ids:
                continue
            if len(crew_members) >= max_crew_size:
                break

            # Check compatibility with existing crew members
            min_compatibility = min(
                compatibility_matrix.get((cm["id"], candidate["id"]), 0)
                + compatibility_matrix.get((candidate["id"], cm["id"]), 0)
                for cm in crew_members
            )

            if min_compatibility > 0.1:  # Threshold
                crew_members.append(candidate)
                used_user_ids.add(candidate["id"])

        # Only create crew if we have at least 3 members
        if len(crew_members) >= 3:
            # Generate crew name from shared interests
            all_interests = []
            for member in crew_members:
                all_interests.extend(member.get("interests", []))
            shared_interests = [
                interest
                for interest in set(all_interests)
                if sum(1 for m in crew_members if interest in m.get("interests", []))
                >= len(crew_members) // 2
            ]

            crew_name = f"{event.get('category', 'Event')} Crew"
            if shared_interests:
                crew_name = f"{shared_interests[0].title()} Crew"

            # Create crew
            crew_data = {
                "name": crew_name,
                "event_id": str(event_id),
                "creator_id": crew_members[0]["id"],
                "max_members": len(crew_members),
                "status": "forming",
            }

            crew_response = supabase.table("crews").insert(crew_data).execute()
            if crew_response.data:
                crew = crew_response.data[0]

                # Add crew members
                for member in crew_members:
                    supabase.table("crew_members").insert(
                        {
                            "crew_id": crew["id"],
                            "user_id": member["id"],
                            "status": "invited",
                        }
                    ).execute()

                crews.append(crew)
                logger.info(
                    f"Auto-formed crew {crew['id']} with {len(crew_members)} members for event {event_id}"
                )

    return crews
