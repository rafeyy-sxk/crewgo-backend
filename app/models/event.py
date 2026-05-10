"""Event Pydantic models for request/response validation."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class EventBase(BaseModel):
    """Base event model."""

    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = Field(..., min_length=1, max_length=50)
    tags: List[str] = Field(default_factory=list)
    venue_name: Optional[str] = Field(None, max_length=200)
    venue_address: Optional[str] = None
    city: str = Field(..., min_length=1, max_length=50)
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    image_url: Optional[str] = None
    ticket_url: Optional[str] = None
    is_free: bool = True
    price_min: Optional[Decimal] = Field(None, ge=0)
    price_max: Optional[Decimal] = Field(None, ge=0)


class EventCreate(EventBase):
    """Event creation model."""

    external_id: Optional[str] = None
    source: str = Field(default="manual", pattern="^(eventbrite|google_places|manual)$")


class EventResponse(EventBase):
    """Event response model."""

    id: UUID
    external_id: Optional[str] = None
    source: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class EventInterestResponse(BaseModel):
    """Event interest response."""

    event_id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    """Paginated event list response."""

    events: List[EventResponse]
    total: int
    page: int = 1
    page_size: int = 10
