"""Firebase Cloud Messaging (FCM) push notification service.

This module provides functions for sending push notifications to users
via Firebase Cloud Messaging.
"""

from typing import Dict, List, Optional

import firebase_admin
from firebase_admin import credentials, messaging

from app.config import settings
from app.core.exceptions import CrewgoException
from app.core.logging import get_logger

logger = get_logger(__name__)

# Initialize Firebase Admin SDK
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
except Exception as e:
    logger.warning(f"Firebase initialization failed: {str(e)}")


class NotificationServiceException(CrewgoException):
    """Exception raised by notification service."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="NOTIFICATION_ERROR",
            status_code=500,
        )


async def send_notification(
    fcm_token: str,
    title: str,
    body: str,
    data: Optional[Dict] = None,
) -> bool:
    """Send a push notification to a single device.

    Args:
        fcm_token: FCM registration token
        title: Notification title
        body: Notification body
        data: Optional additional data payload

    Returns:
        True if sent successfully, False otherwise
    """
    try:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            token=fcm_token,
        )

        response = messaging.send(message)
        logger.info(f"Successfully sent notification: {response}")
        return True

    except messaging.UnregisteredError:
        logger.warning(f"FCM token unregistered: {fcm_token}")
        return False
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        return False


async def send_multicast_notification(
    fcm_tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict] = None,
) -> Dict[str, int]:
    """Send push notifications to multiple devices.

    Args:
        fcm_tokens: List of FCM registration tokens
        title: Notification title
        body: Notification body
        data: Optional additional data payload

    Returns:
        Dictionary with success_count and failure_count
    """
    if not fcm_tokens:
        return {"success_count": 0, "failure_count": 0}

    try:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            tokens=fcm_tokens,
        )

        response = messaging.send_multicast(message)
        logger.info(
            f"Sent multicast notification: {response.success_count} success, "
            f"{response.failure_count} failures"
        )

        return {
            "success_count": response.success_count,
            "failure_count": response.failure_count,
        }

    except Exception as e:
        logger.error(f"Error sending multicast notification: {str(e)}")
        return {"success_count": 0, "failure_count": len(fcm_tokens)}


async def send_to_crew(
    crew_member_tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict] = None,
) -> Dict[str, int]:
    """Send notification to all crew members.

    Args:
        crew_member_tokens: List of FCM tokens for crew members
        title: Notification title
        body: Notification body
        data: Optional additional data payload

    Returns:
        Dictionary with success_count and failure_count
    """
    # Filter out None/empty tokens
    valid_tokens = [token for token in crew_member_tokens if token]
    return await send_multicast_notification(valid_tokens, title, body, data)
