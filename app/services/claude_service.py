"""Claude AI service for context-aware crew chat assistance.

Groq handles high-volume background tasks (icebreakers, daily prompts).
Claude handles in-chat AI where context depth and quality matter.
"""

import anthropic
from typing import Dict, List, Optional

from app.config import settings
from app.core.exceptions import CrewgoException
from app.core.logging import get_logger

logger = get_logger(__name__)

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are CrewAI, the AI assistant built into CrewGO — a social app that matches people into small crews (max 6) for local events in Lahore, Pakistan.

You know everything about the crew you're in: who's in it, their interests, the event they're attending together, and the recent chat history.

Your job:
- Help the crew coordinate and plan (meeting point, timing, what to bring)
- Suggest activities before/after the event based on shared interests
- Answer questions about the event or venue
- Keep conversation fun and engaging
- Use a warm, casual tone — like a smart friend, not a chatbot
- Be concise. No bullet-point walls. Short punchy replies.
- If asked something you don't know, be honest but helpful.
- You can use Urdu/English mix (Urdu roman script) if the crew seems to prefer it.

You are NOT a general-purpose AI. Stay focused on helping THIS crew with THIS event."""


def _build_context(
    crew: Dict,
    event: Dict,
    members: List[Dict],
    recent_messages: List[Dict],
) -> str:
    """Build rich context string for Claude."""
    member_lines = []
    for m in members:
        interests = ", ".join(m.get("interests", [])[:5]) or "not set"
        member_lines.append(f"  - {m['full_name']} (interests: {interests})")

    members_str = "\n".join(member_lines)

    history_lines = []
    for msg in recent_messages[-15:]:  # last 15 messages
        sender = msg.get("sender_name", "Unknown")
        content = msg.get("content", "")
        if msg.get("is_ai"):
            history_lines.append(f"CrewAI: {content}")
        else:
            history_lines.append(f"{sender}: {content}")
    history_str = "\n".join(history_lines) if history_lines else "No messages yet."

    return f"""CREW CONTEXT:
Crew name: {crew.get('name', 'Unnamed Crew')}
Max members: {crew.get('max_members', 6)}
Status: {crew.get('status', 'forming')}

EVENT:
Title: {event.get('title', 'Unknown event')}
Category: {event.get('category', 'General')}
Venue: {event.get('venue_name', 'TBD')} — {event.get('venue_address', '')}
Date: {event.get('start_datetime', 'TBD')}
Description: {event.get('description', 'No description')[:300]}

CREW MEMBERS ({len(members)}):
{members_str}

RECENT CHAT:
{history_str}"""


async def get_crew_ai_response(
    user_message: str,
    crew: Dict,
    event: Dict,
    members: List[Dict],
    recent_messages: List[Dict],
) -> str:
    """Get Claude's response for a crew chat message.

    Args:
        user_message: The user's message to the AI
        crew: Crew dict with name, status, max_members
        event: Event dict with title, venue, datetime, description
        members: List of crew member dicts with name and interests
        recent_messages: Recent chat history

    Returns:
        Claude's response string
    """
    context = _build_context(crew, event, members, recent_messages)

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"{context}\n\n---\nUser message: {user_message}",
                }
            ],
        )
        text = response.content[0].text if response.content else ""
        logger.info(f"Claude response for crew {crew.get('id')}: {text[:80]}...")
        return text

    except anthropic.APIError as e:
        logger.error(f"Claude API error: {e}")
        raise CrewgoException(
            message="AI assistant is temporarily unavailable",
            code="CLAUDE_ERROR",
            status_code=503,
        )


async def generate_crew_intro(
    crew: Dict,
    event: Dict,
    members: List[Dict],
) -> str:
    """Generate a welcome message when a crew is first formed."""
    context = _build_context(crew, event, members, [])

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=200,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"{context}\n\n---\nGenerate a short, exciting welcome message for this newly formed crew. "
                    "Mention the event, acknowledge the members (by first name), and get them hyped. "
                    "Max 3 sentences. No emoji overload.",
                }
            ],
        )
        return response.content[0].text if response.content else ""

    except anthropic.APIError as e:
        logger.error(f"Claude crew intro error: {e}")
        return f"Welcome to {crew.get('name', 'the crew')}! You're all set for {event.get('title', 'the event')}. Let's make it happen! 🎉"
