"""Crew reel API endpoints.

This module provides endpoints for uploading reel clips, stitching reels,
and retrieving reel data.
"""

import os
import tempfile
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from supabase import Client

from app.core.exceptions import CrewNotFoundException, ReelNotFoundException, VideoProcessingException
from app.core.logging import get_logger
from app.core.security import get_current_user
from app.db.client import get_supabase_client
from app.models.reel import ReelResponse, ReelStitchRequest, ReelUploadResponse
from app.services.reel_service import (
    stitch_crew_reel,
    upload_reel,
    upload_thumbnail,
)
from app.services.storage_service import upload_file_obj

logger = get_logger(__name__)

router = APIRouter(prefix="/reels", tags=["reels"])


@router.post("/{crew_id}/upload-clip", response_model=ReelUploadResponse)
async def upload_clip(
    crew_id: UUID,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Upload a 15-second video clip for crew reel.

    Args:
        crew_id: Crew ID
        file: Video file upload
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Upload response with clip URL

    Raises:
        HTTPException: If crew not found, user not a member, or upload fails
    """
    try:
        # Verify crew exists and user is member
        crew_response = (
            supabase.table("crews")
            .select("*")
            .eq("id", str(crew_id))
            .execute()
        )

        if not crew_response.data:
            raise CrewNotFoundException(str(crew_id))

        crew = crew_response.data[0]

        member_check = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .eq("user_id", current_user["id"])
            .execute()
        )

        if not member_check.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this crew",
            )

        # Validate file type
        if not file.content_type or not file.content_type.startswith("video/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a video",
            )

        # Get or create reel record
        reel_response = (
            supabase.table("reels")
            .select("*")
            .eq("crew_id", str(crew_id))
            .execute()
        )

        if reel_response.data:
            reel = reel_response.data[0]
        else:
            # Create new reel
            reel_data = {
                "crew_id": str(crew_id),
                "event_id": str(crew.get("event_id")),
                "status": "collecting",
            }
            reel_response = supabase.table("reels").insert(reel_data).execute()
            reel = reel_response.data[0]

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        try:
            # Upload to R2
            clip_index = len(reel.get("clip_urls", []))
            object_key = f"reels/{reel['id']}/clips/{current_user['id']}_{clip_index}.mp4"

            with open(temp_path, "rb") as f:
                clip_url = upload_file_obj(f, object_key, content_type="video/mp4")

            # Update reel with new clip URL
            clip_urls = reel.get("clip_urls", [])
            clip_urls.append(clip_url)

            supabase.table("reels").update({"clip_urls": clip_urls}).eq(
                "id", reel["id"]
            ).execute()

            logger.info(
                f"Uploaded clip {clip_index} for reel {reel['id']} by user {current_user['id']}"
            )

            return ReelUploadResponse(
                clip_url=clip_url,
                reel_id=UUID(reel["id"]),
                clip_index=clip_index,
                message="Clip uploaded successfully",
            )

        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except (CrewNotFoundException, HTTPException):
        raise
    except Exception as e:
        logger.error(f"Error uploading clip: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload clip",
        )


@router.post("/{crew_id}/stitch", response_model=ReelResponse)
async def stitch_reel(
    crew_id: UUID,
    stitch_data: ReelStitchRequest = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Trigger reel stitching process.

    Args:
        crew_id: Crew ID
        stitch_data: Optional stitching parameters
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        Updated reel data

    Raises:
        HTTPException: If crew not found, user not a member, or stitching fails
    """
    try:
        # Verify crew exists and user is member
        crew_response = (
            supabase.table("crews")
            .select("*")
            .eq("id", str(crew_id))
            .execute()
        )

        if not crew_response.data:
            raise CrewNotFoundException(str(crew_id))

        crew = crew_response.data[0]

        member_check = (
            supabase.table("crew_members")
            .select("id")
            .eq("crew_id", str(crew_id))
            .eq("user_id", current_user["id"])
            .execute()
        )

        if not member_check.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this crew",
            )

        # Get reel
        reel_response = (
            supabase.table("reels")
            .select("*")
            .eq("crew_id", str(crew_id))
            .execute()
        )

        if not reel_response.data:
            raise ReelNotFoundException()

        reel = reel_response.data[0]

        clip_urls = reel.get("clip_urls", [])
        if len(clip_urls) < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Need at least 1 clip to stitch reel",
            )

        # Update status to processing
        supabase.table("reels").update({"status": "processing"}).eq(
            "id", reel["id"]
        ).execute()

        try:
            # Fetch event
            event_response = (
                supabase.table("events")
                .select("*")
                .eq("id", str(crew["event_id"]))
                .execute()
            )
            event = event_response.data[0] if event_response.data else {}

            # Download clips temporarily (simplified - in production, use R2 SDK)
            # For now, we'll assume clips are accessible and use their URLs
            # In production, download from R2, process, then upload result

            # Stitch reel (this would download, process, and upload in production)
            watermark_text = (
                stitch_data.watermark_text if stitch_data else None
            )
            final_path, thumbnail_path = stitch_crew_reel(
                clip_urls, crew, event, watermark_text
            )

            # Upload final reel and thumbnail
            final_url = await upload_reel(final_path, UUID(reel["id"]))
            thumbnail_url = await upload_thumbnail(
                thumbnail_path, UUID(reel["id"])
            )

            # Update reel
            supabase.table("reels").update(
                {
                    "status": "ready",
                    "final_url": final_url,
                    "thumbnail_url": thumbnail_url,
                    "watermark_text": watermark_text,
                }
            ).eq("id", reel["id"]).execute()

            logger.info(f"Stitched reel {reel['id']} for crew {crew_id}")

            # Fetch updated reel
            updated_reel = (
                supabase.table("reels")
                .select("*")
                .eq("id", reel["id"])
                .execute()
            )

            return ReelResponse(**updated_reel.data[0])

        except VideoProcessingException as e:
            # Update status to failed
            supabase.table("reels").update({"status": "failed"}).eq(
                "id", reel["id"]
            ).execute()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Video processing failed: {str(e)}",
            )

    except (CrewNotFoundException, ReelNotFoundException, HTTPException):
        raise
    except Exception as e:
        logger.error(f"Error stitching reel: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stitch reel",
        )


@router.get("/{reel_id}", response_model=ReelResponse)
async def get_reel(
    reel_id: UUID,
    supabase: Client = Depends(get_supabase_client),
):
    """Get reel details.

    Args:
        reel_id: Reel ID
        supabase: Supabase client

    Returns:
        Reel data

    Raises:
        HTTPException: If reel not found
    """
    try:
        reel_response = (
            supabase.table("reels")
            .select("*")
            .eq("id", str(reel_id))
            .execute()
        )

        if not reel_response.data:
            raise ReelNotFoundException(str(reel_id))

        return ReelResponse(**reel_response.data[0])

    except ReelNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Error fetching reel: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch reel",
        )


@router.get("/crews/{crew_id}/reel", response_model=ReelResponse)
async def get_crew_reel(
    crew_id: UUID,
    supabase: Client = Depends(get_supabase_client),
):
    """Get reel for a crew.

    Args:
        crew_id: Crew ID
        supabase: Supabase client

    Returns:
        Reel data

    Raises:
        HTTPException: If reel not found
    """
    try:
        reel_response = (
            supabase.table("reels")
            .select("*")
            .eq("crew_id", str(crew_id))
            .execute()
        )

        if not reel_response.data:
            raise ReelNotFoundException()

        return ReelResponse(**reel_response.data[0])

    except ReelNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Error fetching crew reel: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch crew reel",
        )
