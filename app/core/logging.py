"""Structured logging configuration.

This module sets up Python's logging module with structured formatting
suitable for production environments.
"""

import logging
import sys
from typing import Optional

from app.config import settings


def setup_logging(log_level: Optional[str] = None) -> None:
    """Configure application-wide logging.

    Args:
        log_level: Optional log level override. Defaults to INFO in production,
                   DEBUG in development.
    """
    if log_level is None:
        log_level = "INFO" if settings.is_production else "DEBUG"

    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )

    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(
        logging.WARNING if settings.is_production else logging.INFO
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for a module.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)
