"""Video reel service for FFmpeg-based video stitching.

This module provides functions for compressing, stitching, and processing
crew reel videos using FFmpeg.
"""

import os
import subprocess
import tempfile
from typing import List, Optional
from uuid import UUID

import ffmpeg

from app.core.exceptions import VideoProcessingException
from app.core.logging import get_logger
from app.services.storage_service import upload_file, upload_file_obj

logger = get_logger(__name__)


def compress_clip(input_path: str, output_path: str) -> str:
    """Compress a video clip using FFmpeg.

    Args:
        input_path: Path to input video file
        output_path: Path to output compressed video file

    Returns:
        Path to compressed video file

    Raises:
        VideoProcessingException: If compression fails
    """
    try:
        (
            ffmpeg.input(input_path)
            .output(
                output_path,
                vcodec="libx264",
                preset="medium",
                crf=23,
                maxrate="800k",
                bufsize="1600k",
                vf="scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
                acodec="aac",
                audio_bitrate="128k",
                movflags="faststart",
            )
            .overwrite_output()
            .run(quiet=True, capture_stderr=True)
        )

        logger.info(f"Compressed clip: {input_path} -> {output_path}")
        return output_path

    except ffmpeg.Error as e:
        error_message = e.stderr.decode() if e.stderr else str(e)
        logger.error(f"FFmpeg compression error: {error_message}")
        raise VideoProcessingException(f"Failed to compress clip: {error_message}")
    except Exception as e:
        logger.error(f"Unexpected error compressing clip: {str(e)}")
        raise VideoProcessingException(f"Failed to compress clip: {str(e)}")


def trim_clip(input_path: str, output_path: str, duration: int = 15) -> str:
    """Trim a video clip to exact duration.

    Args:
        input_path: Path to input video file
        output_path: Path to output trimmed video file
        duration: Duration in seconds (default 15)

    Returns:
        Path to trimmed video file

    Raises:
        VideoProcessingException: If trimming fails
    """
    try:
        (
            ffmpeg.input(input_path)
            .output(
                output_path,
                t=duration,
                vcodec="copy",
                acodec="copy",
            )
            .overwrite_output()
            .run(quiet=True, capture_stderr=True)
        )

        logger.info(f"Trimmed clip to {duration}s: {input_path} -> {output_path}")
        return output_path

    except ffmpeg.Error as e:
        error_message = e.stderr.decode() if e.stderr else str(e)
        logger.error(f"FFmpeg trim error: {error_message}")
        raise VideoProcessingException(f"Failed to trim clip: {error_message}")
    except Exception as e:
        logger.error(f"Unexpected error trimming clip: {str(e)}")
        raise VideoProcessingException(f"Failed to trim clip: {str(e)}")


def stitch_crew_reel(
    clip_paths: List[str],
    crew: dict,
    event: dict,
    watermark_text: Optional[str] = None,
) -> tuple[str, str]:
    """Stitch multiple clips into a single crew reel.

    Args:
        clip_paths: List of paths to video clip files
        crew: Crew dictionary with details
        event: Event dictionary with details
        watermark_text: Optional custom watermark text

    Returns:
        Tuple of (output_video_path, thumbnail_path)

    Raises:
        VideoProcessingException: If stitching fails
    """
    if not clip_paths:
        raise VideoProcessingException("No clips provided for stitching")

    try:
        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Step 1: Compress and trim all clips
            processed_clips = []
            for i, clip_path in enumerate(clip_paths):
                compressed_path = os.path.join(temp_dir, f"compressed_{i}.mp4")
                trimmed_path = os.path.join(temp_dir, f"trimmed_{i}.mp4")

                compress_clip(clip_path, compressed_path)
                trim_clip(compressed_path, trimmed_path, duration=15)
                processed_clips.append(trimmed_path)

            # Step 2: Determine layout based on number of clips
            num_clips = len(processed_clips)
            output_path = os.path.join(temp_dir, "final_reel.mp4")

            if num_clips == 1:
                # Single clip, just add watermark
                final_video = ffmpeg.input(processed_clips[0])
            elif num_clips == 2:
                # Two clips side by side
                video1 = ffmpeg.input(processed_clips[0])
                video2 = ffmpeg.input(processed_clips[1])
                final_video = ffmpeg.filter(
                    [video1, video2], "hstack", inputs=2
                )
            elif num_clips == 3:
                # Three clips: two on top, one below
                video1 = ffmpeg.input(processed_clips[0])
                video2 = ffmpeg.input(processed_clips[1])
                video3 = ffmpeg.input(processed_clips[2])

                top_row = ffmpeg.filter([video1, video2], "hstack", inputs=2)
                final_video = ffmpeg.filter(
                    [top_row, video3], "vstack", inputs=2
                )
            else:
                # 4+ clips: 2x2 grid
                video_inputs = [ffmpeg.input(path) for path in processed_clips[:4]]
                top_row = ffmpeg.filter([video_inputs[0], video_inputs[1]], "hstack", inputs=2)
                bottom_row = ffmpeg.filter([video_inputs[2], video_inputs[3]], "hstack", inputs=2)
                final_video = ffmpeg.filter([top_row, bottom_row], "vstack", inputs=2)

            # Step 3: Add watermark text
            watermark = watermark_text or f"{crew.get('name', 'Crew')} | {event.get('title', 'Event')} | {event.get('city', 'Lahore')} | {event.get('start_datetime', '')[:10]}"

            # Scale final video to max 720p
            final_video = final_video.filter(
                "scale", "min(1280,iw)", "min(720,ih)", force_original_aspect_ratio="decrease"
            )

            # Add text watermark (bottom right)
            final_video = final_video.drawtext(
                text=watermark,
                fontfile=None,  # Use default font
                fontsize=20,
                fontcolor="white",
                x="w-text_w-10",
                y="h-text_h-10",
                box=1,
                boxcolor="black@0.5",
                boxborderw=5,
            )

            # Output settings
            output = final_video.output(
                output_path,
                vcodec="libx264",
                preset="medium",
                crf=23,
                maxrate="2000k",
                bufsize="4000k",
                acodec="aac",
                audio_bitrate="128k",
                t=60,  # Max 60 seconds
                movflags="faststart",
            )

            output.overwrite_output().run(quiet=True, capture_stderr=True)

            # Step 4: Generate thumbnail (frame at 3 seconds)
            thumbnail_path = os.path.join(temp_dir, "thumbnail.jpg")
            (
                ffmpeg.input(output_path, ss=3)
                .output(
                    thumbnail_path,
                    vframes=1,
                    vf="scale=720:1280:force_original_aspect_ratio=decrease",
                )
                .overwrite_output()
                .run(quiet=True, capture_stderr=True)
            )

            # Copy files to permanent location before temp_dir is deleted
            permanent_output = os.path.join(tempfile.gettempdir(), f"reel_{crew.get('id', 'temp')}.mp4")
            permanent_thumbnail = os.path.join(tempfile.gettempdir(), f"thumbnail_{crew.get('id', 'temp')}.jpg")

            import shutil
            shutil.copy2(output_path, permanent_output)
            shutil.copy2(thumbnail_path, permanent_thumbnail)

            logger.info(f"Stitched crew reel with {num_clips} clips")
            return permanent_output, permanent_thumbnail

    except ffmpeg.Error as e:
        error_message = e.stderr.decode() if e.stderr else str(e)
        logger.error(f"FFmpeg stitching error: {error_message}")
        raise VideoProcessingException(f"Failed to stitch reel: {error_message}")
    except Exception as e:
        logger.error(f"Unexpected error stitching reel: {str(e)}")
        raise VideoProcessingException(f"Failed to stitch reel: {str(e)}")


def generate_thumbnail(video_path: str, output_path: str, timestamp: float = 3.0) -> str:
    """Generate a thumbnail from a video.

    Args:
        video_path: Path to input video file
        output_path: Path to output thumbnail image
        timestamp: Timestamp in seconds to extract frame (default 3.0)

    Returns:
        Path to generated thumbnail

    Raises:
        VideoProcessingException: If thumbnail generation fails
    """
    try:
        (
            ffmpeg.input(video_path, ss=timestamp)
            .output(
                output_path,
                vframes=1,
                vf="scale=720:1280:force_original_aspect_ratio=decrease",
            )
            .overwrite_output()
            .run(quiet=True, capture_stderr=True)
        )

        logger.info(f"Generated thumbnail: {video_path} -> {output_path}")
        return output_path

    except ffmpeg.Error as e:
        error_message = e.stderr.decode() if e.stderr else str(e)
        logger.error(f"FFmpeg thumbnail error: {error_message}")
        raise VideoProcessingException(f"Failed to generate thumbnail: {error_message}")
    except Exception as e:
        logger.error(f"Unexpected error generating thumbnail: {str(e)}")
        raise VideoProcessingException(f"Failed to generate thumbnail: {str(e)}")


async def upload_reel(file_path: str, reel_id: UUID) -> str:
    """Upload a reel video file to R2 storage.

    Args:
        file_path: Local path to video file
        reel_id: Reel ID for object key

    Returns:
        Public URL of uploaded file
    """
    from app.services.storage_service import upload_file
    
    object_key = f"reels/{reel_id}/final.mp4"
    return upload_file(file_path, object_key, content_type="video/mp4")


async def upload_thumbnail(file_path: str, reel_id: UUID) -> str:
    """Upload a thumbnail image to R2 storage.

    Args:
        file_path: Local path to thumbnail image
        reel_id: Reel ID for object key

    Returns:
        Public URL of uploaded thumbnail
    """
    from app.services.storage_service import upload_file
    
    object_key = f"reels/{reel_id}/thumbnail.jpg"
    return upload_file(file_path, object_key, content_type="image/jpeg")
