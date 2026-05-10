"""Supabase database client singleton.

This module provides a singleton Supabase client instance configured
with the service role key for backend operations. The client is
async-compatible and ready for connection pooling.
"""

from typing import Optional

from supabase import Client, create_client

from app.config import settings


class SupabaseClient:
    """Singleton wrapper for Supabase client."""

    _instance: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client instance."""
        if cls._instance is None:
            cls._instance = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key,
            )
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        """Reset client instance (useful for testing)."""
        cls._instance = None


def get_supabase_client() -> Client:
    """Get cached Supabase client instance."""
    return SupabaseClient.get_client()
