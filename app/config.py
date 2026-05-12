"""Application configuration using Pydantic BaseSettings."""

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

    # ── Core (required) ───────────────────────────────────────────────────────
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_anon_key: str = Field(..., description="Supabase anonymous key")
    supabase_service_role_key: str = Field(..., description="Supabase service role key")
    secret_key: str = Field(..., description="JWT secret key (min 32 chars)")

    # ── AI ────────────────────────────────────────────────────────────────────
    groq_api_key: str = Field(..., description="Groq API key")
    groq_model: str = Field(default="llama3-70b-8192", description="Groq model")
    anthropic_api_key: str = Field(..., description="Anthropic API key")
    claude_model: str = Field(default="claude-opus-4-7", description="Claude model")

    # ── Optional services (gracefully degrade when not set) ───────────────────
    eventbrite_api_key: Optional[str] = Field(default=None, description="Eventbrite API key")
    google_places_api_key: Optional[str] = Field(default=None, description="Google Places API key")
    r2_account_id: Optional[str] = Field(default=None, description="Cloudflare R2 account ID")
    r2_access_key_id: Optional[str] = Field(default=None, description="R2 access key ID")
    r2_secret_access_key: Optional[str] = Field(default=None, description="R2 secret key")
    r2_bucket_name: str = Field(default="crewgo-reels", description="R2 bucket name")
    r2_public_url: Optional[str] = Field(default=None, description="R2 public URL")
    firebase_credentials_path: str = Field(default="./firebase-credentials.json")
    resend_api_key: Optional[str] = Field(default=None, description="Resend API key")
    from_email: str = Field(default="hello@crewgo.pk")

    # ── App config ────────────────────────────────────────────────────────────
    app_name: str = Field(default="Crewgo")
    app_env: str = Field(default="development")
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60)
    refresh_token_expire_days: int = Field(default=30)
    default_city: str = Field(default="Lahore")

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    @field_validator("app_env")
    @classmethod
    def validate_app_env(cls, v: str) -> str:
        valid = ["development", "staging", "production"]
        if v not in valid:
            raise ValueError(f"APP_ENV must be one of {valid}")
        return v

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
