from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from the environment / .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "DayFlow API"
    app_environment: Literal["development", "test", "production"] = "development"
    app_debug: bool = False

    # Neon Postgres connection string (paste it verbatim — it's normalized
    # for asyncpg below). Falls back to SQLite in ./data so the API runs
    # without any setup.
    database_url: str = "sqlite+aiosqlite:///./data/dayflow.db"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # one week; mobile-friendly

    # AI
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # mem0 platform key (optional — memory is disabled without it)
    mem0_api_key: str = ""
    local_memory_enabled: bool = False

    # Backend-driven push notifications (Expo Push Service + QStash).
    push_notifications_enabled: bool = False
    expo_push_access_token: str = ""
    qstash_current_signing_key: str = ""
    qstash_next_signing_key: str = ""
    internal_scheduler_secret: str = ""
    notification_grace_minutes: int = 30

    cors_origins: list[str] = ["*"]

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Accept a Neon/psql connection string pasted verbatim and adapt it
        for asyncpg: swap the driver and translate libpq-only query params."""
        if not v:
            return "sqlite+aiosqlite:///./data/dayflow.db"
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql://", 1)
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        if "+asyncpg" in v and "?" in v:
            base, query = v.split("?", 1)
            params = [p for p in query.split("&") if p]
            keep, needs_ssl = [], False
            for p in params:
                key = p.split("=", 1)[0]
                if key in ("sslmode", "channel_binding"):
                    needs_ssl = needs_ssl or key == "sslmode"
                else:
                    keep.append(p)
            if needs_ssl and not any(p.startswith("ssl=") for p in keep):
                keep.append("ssl=require")
            v = base + ("?" + "&".join(keep) if keep else "")
        return v

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        """Fail at startup instead of silently using unsafe production defaults."""
        if self.app_environment != "production":
            return self
        if self.database_url.startswith("sqlite"):
            raise ValueError("DATABASE_URL must point to Postgres in production")
        if self.jwt_secret == "change-me-in-production" or len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET must be a random value of at least 32 characters")
        if self.app_debug:
            raise ValueError("APP_DEBUG must be false in production")
        if self.push_notifications_enabled:
            if not self.groq_api_key:
                raise ValueError("GROQ_API_KEY is required when push notifications are enabled")
            if not (
                (self.qstash_current_signing_key and self.qstash_next_signing_key)
                or self.internal_scheduler_secret
            ):
                raise ValueError(
                    "Configure QStash signing keys or INTERNAL_SCHEDULER_SECRET "
                    "when push notifications are enabled"
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
