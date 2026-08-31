import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_rejects_local_database_and_default_secret():
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            app_environment="production",
            database_url="",
            jwt_secret="change-me-in-production",
        )


def test_production_accepts_postgres_and_strong_secret():
    settings = Settings(
        _env_file=None,
        app_environment="production",
        database_url="postgresql://user:pass@example.com/dayflow?sslmode=require",
        jwt_secret="a" * 32,
    )
    assert settings.database_url.startswith("postgresql+asyncpg://")
    assert "ssl=require" in settings.database_url
