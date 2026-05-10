"""Reel cleanup background tasks.

This module provides background tasks for cleaning up expired reels
from storage and database.
"""

from datetime import datetime

from app.core.logging import get_logger
from app.db.client import get_supabase_client
from app.services.storage_service import delete_file

logger = get_logger(__name__)


async def cleanup_expired_reels_task() -> None:
    """Background task to cleanup expired reels (30 days old)."""
    try:
        logger.info("Starting expired reels cleanup task")

        supabase = get_supabase_client()
        now = datetime.utcnow()

        # Find expired reels
        reels_response = (
            supabase.table("reels")
            .select("id, final_url, thumbnail_url, clip_urls")
            .lt("expires_at", now.isoformat())
            .execute()
        )

        reels = reels_response.data
        logger.info(f"Found {len(reels)} expired reels to cleanup")

        deleted_count = 0

        for reel in reels:
            try:
                # Delete final video from R2
                if reel.get("final_url"):
                    # Extract object key from URL
                    # Assuming URL format: https://public-url/reels/{reel_id}/final.mp4
                    reel_id = reel["id"]
                    final_key = f"reels/{reel_id}/final.mp4"
                    delete_file(final_key)

                # Delete thumbnail from R2
                if reel.get("thumbnail_url"):
                    reel_id = reel["id"]
                    thumbnail_key = f"reels/{reel_id}/thumbnail.jpg"
                    delete_file(thumbnail_key)

                # Delete clips from R2
                clip_urls = reel.get("clip_urls", [])
                for i, clip_url in enumerate(clip_urls):
                    reel_id = reel["id"]
                    clip_key = f"reels/{reel_id}/clips/clip_{i}.mp4"
                    delete_file(clip_key)

                # Update reel status to expired (or delete record)
                supabase.table("reels").update({"status": "expired"}).eq(
                    "id", reel["id"]
                ).execute()

                deleted_count += 1
                logger.info(f"Cleaned up expired reel {reel['id']}")

            except Exception as e:
                logger.error(f"Error cleaning up reel {reel['id']}: {str(e)}")
                continue

        logger.info(f"Expired reels cleanup completed: {deleted_count} reels cleaned")

    except Exception as e:
        logger.error(f"Error in expired reels cleanup task: {str(e)}")
