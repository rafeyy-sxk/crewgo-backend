"""Reel Pydantic models for request/response validation."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ReelBase(BaseModel):
    """Base reel model."""

    crew_id: UUID
    event_id: Optional[UUID] = None
    watermark_text: Optional[str] = Field(None, max_length=100)


class ReelResponse(ReelBase):
    """Reel response model."""

    id: UUID
    status: str
    clip_urls: List[str] = []
    final_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    view_count: int = 0
    share_count: int = 0
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class ReelUploadResponse(BaseModel):
    """Reel clip upload response."""

    clip_url: str
    reel_id: UUID
    clip_index: int
    message: str


class ReelStitchRequest(BaseModel):
    """Reel stitching request model."""

    watermark_text: Optional[str] = Field(None, max_length=100)
