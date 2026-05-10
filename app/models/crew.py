"""Crew Pydantic models for request/response validation."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.user import UserPublic


class CrewBase(BaseModel):
    """Base crew model."""

    name: str = Field(..., min_length=1, max_length=100)
    event_id: UUID
    max_members: int = Field(default=6, ge=2, le=6)
    meeting_point: Optional[str] = Field(None, max_length=200)
    carpool_available: bool = False


class CrewCreate(CrewBase):
    """Crew creation model."""

    pass


class CrewUpdate(BaseModel):
    """Crew update model."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    meeting_point: Optional[str] = Field(None, max_length=200)
    carpool_available: Optional[bool] = None
    status: Optional[str] = Field(
        None, pattern="^(forming|confirmed|completed|cancelled)$"
    )


class CrewMemberResponse(BaseModel):
    """Crew member response model."""

    id: UUID
    crew_id: UUID
    user_id: UUID
    status: str
    joined_at: datetime
    user: Optional[UserPublic] = None

    class Config:
        from_attributes = True


class CrewResponse(CrewBase):
    """Crew response model."""

    id: UUID
    creator_id: UUID
    status: str
    ai_icebreaker: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    members: List[CrewMemberResponse] = []

    class Config:
        from_attributes = True


class CrewInviteRequest(BaseModel):
    """Crew invite request model."""

    user_id: UUID


class CrewStatusUpdate(BaseModel):
    """Crew member status update model."""

    status: str = Field(..., pattern="^(invited|confirmed|declined|attended)$")


class SuggestedCrewResponse(BaseModel):
    """AI-suggested crew response."""

    suggested_users: List[UserPublic]
    compatibility_scores: dict[str, float]
    reasoning: str
