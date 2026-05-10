"""Custom exception classes and global exception handlers.

This module defines custom exceptions for the Crewgo application
and provides FastAPI exception handlers for consistent error responses.
"""

from datetime import datetime
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)


class CrewgoException(Exception):
    """Base exception for all Crewgo application errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ):
        """Initialize exception.

        Args:
            message: Human-readable error message
            code: Machine-readable error code
            status_code: HTTP status code
        """
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class UserNotFoundException(CrewgoException):
    """Raised when a user is not found."""

    def __init__(self, user_id: str = None):
        message = f"User not found" + (f": {user_id}" if user_id else "")
        super().__init__(
            message=message,
            code="USER_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class CrewFullException(CrewgoException):
    """Raised when a crew has reached maximum capacity."""

    def __init__(self, crew_id: str):
        super().__init__(
            message=f"Crew {crew_id} has reached maximum capacity",
            code="CREW_FULL",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class EventNotFoundException(CrewgoException):
    """Raised when an event is not found."""

    def __init__(self, event_id: str = None):
        message = f"Event not found" + (f": {event_id}" if event_id else "")
        super().__init__(
            message=message,
            code="EVENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedException(CrewgoException):
    """Raised when user is not authorized."""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class VideoProcessingException(CrewgoException):
    """Raised when video processing fails."""

    def __init__(self, message: str = "Video processing failed"):
        super().__init__(
            message=message,
            code="VIDEO_PROCESSING_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class CrewNotFoundException(CrewgoException):
    """Raised when a crew is not found."""

    def __init__(self, crew_id: str = None):
        message = f"Crew not found" + (f": {crew_id}" if crew_id else "")
        super().__init__(
            message=message,
            code="CREW_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ReelNotFoundException(CrewgoException):
    """Raised when a reel is not found."""

    def __init__(self, reel_id: str = None):
        message = f"Reel not found" + (f": {reel_id}" if reel_id else "")
        super().__init__(
            message=message,
            code="REEL_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


def create_error_response(
    code: str, message: str, status_code: int
) -> Dict[str, Any]:
    """Create standardized error response.

    Args:
        code: Machine-readable error code
        message: Human-readable error message
        status_code: HTTP status code

    Returns:
        Error response dictionary
    """
    return {
        "error": True,
        "code": code,
        "message": message,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


async def crewgo_exception_handler(
    request: Request, exc: CrewgoException
) -> JSONResponse:
    """Handle CrewgoException instances.

    Args:
        request: FastAPI request object
        exc: Exception instance

    Returns:
        JSON error response
    """
    logger.error(
        f"CrewgoException: {exc.code} - {exc.message}",
        extra={"path": request.url.path, "method": request.method},
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(exc.code, exc.message, exc.status_code),
    )


async def general_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Handle unexpected exceptions.

    Args:
        request: FastAPI request object
        exc: Exception instance

    Returns:
        JSON error response
    """
    logger.exception(
        f"Unexpected error: {type(exc).__name__} - {str(exc)}",
        extra={"path": request.url.path, "method": request.method},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=create_error_response(
            "INTERNAL_ERROR",
            "An unexpected error occurred",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register exception handlers with FastAPI app.

    Args:
        app: FastAPI application instance
    """
    app.add_exception_handler(CrewgoException, crewgo_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
