"""Chat message Pydantic models for request/response validation."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.user import UserPublic


class ChatMessageBase(BaseModel):
    """Base chat message model."""

    content: str = Field(..., min_length=1, max_length=2000)
    message_type: str = Field(
        default="text", pattern="^(text|ai_prompt|system|image)$"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ChatMessageCreate(ChatMessageBase):
    """Chat message creation model."""

    pass


class ChatMessageResponse(ChatMessageBase):
    """Chat message response model."""

    id: UUID
    crew_id: UUID
    sender_id: Optional[UUID] = None
    created_at: datetime
    sender: Optional[UserPublic] = None

    class Config:
        from_attributes = True


class ChatMessageListResponse(BaseModel):
    """Paginated chat message list response."""

    messages: List[ChatMessageResponse]
    total: int
    page: int = 1
    page_size: int = 20
