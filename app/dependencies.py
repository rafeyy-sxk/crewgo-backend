"""Shared FastAPI dependencies.

This module provides reusable FastAPI dependencies for common use cases.
"""

from typing import Optional

from fastapi import Depends
from supabase import Client

from app.core.security import get_current_user
from app.db.client import get_supabase_client


async def get_db() -> Client:
    """Dependency to get Supabase client."""
    return get_supabase_client()


async def get_authenticated_user() -> dict:
    """Dependency to get current authenticated user."""
    return await get_current_user()
