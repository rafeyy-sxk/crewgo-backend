"""User Pydantic models for request/response validation."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user model with common fields."""

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    city: str = Field(default="Lahore", max_length=50)
    area: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    interests: List[str] = Field(default_factory=list, max_length=20)
    availability: List[str] = Field(default_factory=list)


class UserCreate(UserBase):
    """User creation model."""

    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """User update model (all fields optional)."""

    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    avatar_url: Optional[str] = None
    city: Optional[str] = Field(None, max_length=50)
    area: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    interests: Optional[List[str]] = Field(None, max_length=20)
    availability: Optional[List[str]] = None


class UserResponse(UserBase):
    """User response model."""

    id: UUID
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    fcm_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """Public user profile (minimal info)."""

    id: UUID
    full_name: str
    avatar_url: Optional[str] = None
    city: str
    area: Optional[str] = None
    bio: Optional[str] = None
    interests: List[str] = []

    class Config:
        from_attributes = True


class FCMTokenUpdate(BaseModel):
    """FCM token update model."""

    fcm_token: str = Field(..., min_length=1)


class InterestsUpdate(BaseModel):
    """User interests update model."""

    interests: List[str] = Field(..., min_length=1, max_length=20)
