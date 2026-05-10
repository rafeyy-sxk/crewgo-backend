"""AI service for Groq API integration.

This module provides functions for generating AI content using Groq's
llama3-70b-8192 model, including icebreakers, prompts, and crew names.
"""

import asyncio
from typing import Dict, List

import httpx
from groq import Groq

from app.config import settings
from app.core.exceptions import CrewgoException
from app.core.logging import get_logger

logger = get_logger(__name__)

# Initialize Groq client
groq_client = Groq(api_key=settings.groq_api_key)


class AIServiceException(CrewgoException):
    """Exception raised by AI service."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="AI_SERVICE_ERROR",
            status_code=500,
        )


async def _call_groq_api(
    prompt: str, max_retries: int = 3, timeout: float = 30.0
) -> str:
    """Call Groq API with retry logic.

    Args:
        prompt: Prompt text to send to Groq
        max_retries: Maximum number of retry attempts
        timeout: Request timeout in seconds

    Returns:
        Generated text response

    Raises:
        AIServiceException: If API call fails after retries
    """
    for attempt in range(max_retries):
        try:
            response = groq_client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant for Crewgo, a local event discovery and crew coordination app. Be concise, friendly, and engaging.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=500,
                timeout=timeout,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(
                f"Groq API call failed (attempt {attempt + 1}/{max_retries}): {str(e)}"
            )
            if attempt == max_retries - 1:
                logger.error(f"Groq API call failed after {max_retries} attempts")
                raise AIServiceException(f"Failed to generate AI content: {str(e)}")
            await asyncio.sleep(1 * (attempt + 1))  # Exponential backoff

    raise AIServiceException("Failed to generate AI content after retries")


async def generate_icebreaker(
    crew_members: List[Dict], event: Dict
) -> str:
    """Generate an icebreaker question for a crew.

    Args:
        crew_members: List of crew member dictionaries with interests
        event: Event dictionary with details

    Returns:
        Generated icebreaker question string
    """
    # Extract interests from crew members
    all_interests = []
    for member in crew_members:
        interests = member.get("interests", [])
        all_interests.extend(interests)

    unique_interests = list(set(all_interests))
    interests_str = ", ".join(unique_interests[:10])  # Limit to 10 interests

    prompt = f"""Generate ONE specific, fun, slightly competitive icebreaker question for a crew of {len(crew_members)} people attending this event together.

Event: {event.get('title', 'Unknown')}
Event Category: {event.get('category', 'General')}
Event Description: {event.get('description', 'N/A')[:200]}
Crew Interests: {interests_str if unique_interests else 'Various interests'}

Requirements:
- ONE question only (not multiple)
- Under 100 words
- Conversational and engaging
- Slightly competitive/fun element
- Related to the event or shared interests
- No markdown formatting, just plain text

Generate the icebreaker question:"""

    try:
        result = await _call_groq_api(prompt)
        logger.info(f"Generated icebreaker for crew: {result[:50]}...")
        return result
    except Exception as e:
        logger.error(f"Error generating icebreaker: {str(e)}")
        # Fallback icebreaker
        return f"Who's most excited about {event.get('title', 'this event')}? Share one thing you're looking forward to!"


async def generate_daily_prompt(crew: Dict, event: Dict) -> str:
    """Generate a daily pre-event discussion prompt for a crew.

    Args:
        crew: Crew dictionary with details
        event: Event dictionary with details

    Returns:
        Generated prompt string
    """
    prompt = f"""Generate ONE pre-event discussion question for a crew attending this event together.

Crew Name: {crew.get('name', 'The Crew')}
Event: {event.get('title', 'Unknown')}
Event Date: {event.get('start_datetime', 'Soon')}
Event Category: {event.get('category', 'General')}
Event Description: {event.get('description', 'N/A')[:200]}

Requirements:
- ONE question only
- Encourages discussion before the event
- Helps crew members get to know each other
- Related to the specific event
- Under 100 words
- No markdown formatting, just plain text

Generate the discussion prompt:"""

    try:
        result = await _call_groq_api(prompt)
        logger.info(f"Generated daily prompt for crew {crew.get('id')}: {result[:50]}...")
        return result
    except Exception as e:
        logger.error(f"Error generating daily prompt: {str(e)}")
        # Fallback prompt
        return f"What's one thing you want to experience at {event.get('title', 'this event')}? Let's coordinate!"


async def generate_post_event_reflection(crew: Dict, event: Dict) -> str:
    """Generate a post-event reflection prompt for a crew.

    Args:
        crew: Crew dictionary with details
        event: Event dictionary with details

    Returns:
        Generated reflection prompt string
    """
    prompt = f"""Generate ONE reflection question for a crew that just attended an event together.

Crew Name: {crew.get('name', 'The Crew')}
Event: {event.get('title', 'Unknown')}
Event Category: {event.get('category', 'General')}

Requirements:
- ONE question only
- Encourages reflection on the shared experience
- Helps crew members connect after the event
- Under 100 words
- No markdown formatting, just plain text

Generate the reflection prompt:"""

    try:
        result = await _call_groq_api(prompt)
        logger.info(f"Generated reflection prompt for crew {crew.get('id')}: {result[:50]}...")
        return result
    except Exception as e:
        logger.error(f"Error generating reflection prompt: {str(e)}")
        # Fallback prompt
        return "What was your favorite moment from the event? Share a highlight!"


async def generate_crew_name(interests: List[str], event_category: str) -> str:
    """Generate a fun, memorable crew name based on shared interests.

    Args:
        interests: List of shared interests
        event_category: Event category

    Returns:
        Generated crew name (max 4 words)
    """
    interests_str = ", ".join(interests[:5]) if interests else "various interests"

    prompt = f"""Generate a fun, memorable crew name (maximum 4 words) based on these shared interests and event category.

Shared Interests: {interests_str}
Event Category: {event_category}

Requirements:
- Maximum 4 words
- Fun and memorable
- Related to interests or event category
- No special characters or emojis
- Just the name, no explanation

Generate the crew name:"""

    try:
        result = await _call_groq_api(prompt)
        # Clean up the result (remove quotes, extra text)
        name = result.strip().strip('"').strip("'")
        # Limit to 4 words
        words = name.split()[:4]
        name = " ".join(words)
        logger.info(f"Generated crew name: {name}")
        return name
    except Exception as e:
        logger.error(f"Error generating crew name: {str(e)}")
        # Fallback name
        return f"{event_category.title()} Crew"
