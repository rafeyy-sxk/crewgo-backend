"""APScheduler setup and configuration.

This module configures APScheduler with background jobs for event syncing,
AI prompts, reel cleanup, and automatic crew formation.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.logging import get_logger
from app.tasks import daily_prompts, event_sync, reel_cleanup

logger = get_logger(__name__)

scheduler = AsyncIOScheduler()


def setup_scheduler() -> None:
    """Configure and start the scheduler with all background jobs."""
    # Sync events every 2 hours
    scheduler.add_job(
        event_sync.sync_events_task,
        trigger=IntervalTrigger(hours=2),
        id="sync_events",
        name="Sync events from Eventbrite and Google Places",
        replace_existing=True,
    )

    # Daily AI prompts at 9:00 AM PKT (4:00 AM UTC)
    scheduler.add_job(
        daily_prompts.send_daily_prompts_task,
        trigger=CronTrigger(hour=4, minute=0, timezone="UTC"),
        id="daily_ai_prompts",
        name="Send daily AI prompts to active crews",
        replace_existing=True,
    )

    # Post-event reflections at 10:00 PM PKT (5:00 PM UTC)
    scheduler.add_job(
        daily_prompts.send_post_event_reflections_task,
        trigger=CronTrigger(hour=17, minute=0, timezone="UTC"),
        id="post_event_reflections",
        name="Send post-event reflection prompts",
        replace_existing=True,
    )

    # Cleanup expired reels at 2:00 AM PKT (9:00 PM UTC previous day)
    scheduler.add_job(
        reel_cleanup.cleanup_expired_reels_task,
        trigger=CronTrigger(hour=21, minute=0, timezone="UTC"),
        id="cleanup_expired_reels",
        name="Cleanup expired reels",
        replace_existing=True,
    )

    # Auto crew formation every hour
    scheduler.add_job(
        event_sync.auto_form_crews_task,
        trigger=IntervalTrigger(hours=1),
        id="auto_crew_formation",
        name="Automatically form crews for events",
        replace_existing=True,
    )

    logger.info("Scheduler configured with all background jobs")


def start_scheduler() -> None:
    """Start the scheduler."""
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")


def stop_scheduler() -> None:
    """Stop the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("Scheduler stopped")
