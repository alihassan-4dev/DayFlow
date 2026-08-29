from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from the environment / .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "DayFlow API"
    debug: bool = False

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
