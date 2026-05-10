"""Resend email service for sending transactional emails.

This module provides functions for sending emails via Resend API.
"""

from typing import Dict, List, Optional

import httpx

from app.config import settings
from app.core.exceptions import CrewgoException
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmailServiceException(CrewgoException):
    """Exception raised by email service."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="EMAIL_ERROR",
            status_code=500,
        )


async def send_email(
    to: str | List[str],
    subject: str,
    html_content: str,
    from_email: Optional[str] = None,
) -> bool:
    """Send an email via Resend API.

    Args:
        to: Recipient email address(es)
        subject: Email subject
        html_content: HTML email content
        from_email: Optional sender email (defaults to FROM_EMAIL setting)

    Returns:
        True if sent successfully, False otherwise
    """
    try:
        if from_email is None:
            from_email = settings.from_email

        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "from": from_email,
            "to": to if isinstance(to, list) else [to],
            "subject": subject,
            "html": html_content,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()

        logger.info(f"Email sent successfully: {result.get('id')}")
        return True

    except httpx.HTTPStatusError as e:
        logger.error(f"Resend API error: {e.response.status_code} - {e.response.text}")
        return False
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False


async def send_welcome_email(user_email: str, user_name: str) -> bool:
    """Send welcome email to new user.

    Args:
        user_email: User email address
        user_name: User full name

    Returns:
        True if sent successfully
    """
    html_content = f"""
    <html>
    <body>
        <h1>Welcome to Crewgo, {user_name}!</h1>
        <p>We're excited to have you join our community of event-goers in Lahore.</p>
        <p>Start discovering events and forming crews with like-minded people!</p>
        <p>Best regards,<br>The Crewgo Team</p>
    </body>
    </html>
    """

    return await send_email(
        to=user_email,
        subject="Welcome to Crewgo!",
        html_content=html_content,
    )


async def send_crew_invite_email(
    user_email: str,
    crew_name: str,
    event_title: str,
    inviter_name: str,
) -> bool:
    """Send crew invite email.

    Args:
        user_email: Recipient email
        crew_name: Name of the crew
        event_title: Event title
        inviter_name: Name of person sending invite

    Returns:
        True if sent successfully
    """
    html_content = f"""
    <html>
    <body>
        <h1>You've been invited to join {crew_name}!</h1>
        <p>{inviter_name} has invited you to join their crew for:</p>
        <h2>{event_title}</h2>
        <p>Open the Crewgo app to accept the invitation and start chatting with your crew!</p>
        <p>Best regards,<br>The Crewgo Team</p>
    </body>
    </html>
    """

    return await send_email(
        to=user_email,
        subject=f"Invitation to join {crew_name}",
        html_content=html_content,
    )
