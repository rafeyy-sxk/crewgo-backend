"""Application configuration using Pydantic BaseSettings.

This module provides a singleton configuration instance that loads
all environment variables with validation and type conversion.
"""

import os
from functools import lru_cache
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Supabase Configuration
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_anon_key: str = Field(..., description="Supabase anonymous key")
    supabase_service_role_key: str = Field(..., description="Supabase service role key")

    # Groq AI Configuration
    groq_api_key: str = Field(..., description="Groq API key")
    groq_model: str = Field(
        default="llama3-70b-8192", description="Groq model name"
    )

    # Eventbrite Configuration
    eventbrite_api_key: str = Field(..., description="Eventbrite API key")

    # Google Places Configuration
    google_places_api_key: str = Field(..., description="Google Places API key")

    # Cloudflare R2 Configuration
    r2_account_id: str = Field(..., description="Cloudflare R2 account ID")
    r2_access_key_id: str = Field(..., description="R2 access key ID")
    r2_secret_access_key: str = Field(..., description="R2 secret access key")
    r2_bucket_name: str = Field(
        default="crewgo-reels", description="R2 bucket name"
    )
    r2_public_url: str = Field(..., description="R2 public bucket URL")

    # Firebase Configuration
    firebase_credentials_path: str = Field(
        default="./firebase-credentials.json",
        description="Path to Firebase credentials JSON file",
    )

    # Resend Email Configuration
    resend_api_key: str = Field(..., description="Resend API key")
    from_email: str = Field(
        default="hello@crewgo.pk", description="Default sender email"
    )

    # Application Configuration
    app_name: str = Field(default="Crewgo", description="Application name")
    app_env: str = Field(
        default="development", description="Application environment"
    )
    secret_key: str = Field(..., description="JWT secret key (min 32 chars)")
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(
        default=60, description="Access token expiration in minutes"
    )
    refresh_token_expire_days: int = Field(
        default=30, description="Refresh token expiration in days"
    )
    default_city: str = Field(
        default="Lahore", description="Default city for events"
    )

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate secret key is at least 32 characters."""
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    @field_validator("app_env")
    @classmethod
    def validate_app_env(cls, v: str) -> str:
        """Validate app environment is valid."""
        valid_envs = ["development", "staging", "production"]
        if v not in valid_envs:
            raise ValueError(f"APP_ENV must be one of {valid_envs}")
        return v

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.app_env == "development"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance (singleton pattern)."""
    return Settings()


# Global settings instance
settings = get_settings()
