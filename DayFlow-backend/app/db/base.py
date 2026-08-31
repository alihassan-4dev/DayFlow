from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()


def _engine_options(url: str) -> dict[str, Any]:
    """Postgres on a serverless host needs different pooling than a local file.

    Each Vercel function instance is short-lived and can be frozen between
    requests, so a per-instance connection pool would pin Postgres connections
    that nothing can reuse — and a handful of cold starts exhausts a Neon free
    tier. NullPool hands connection reuse to Neon's own pooled endpoint (the
    `-pooler` host) instead. That endpoint runs pgbouncer in transaction mode,
    which cannot support asyncpg's prepared-statement cache, so it is disabled.
    """
    if url.startswith("sqlite"):
        return {}
    return {
        "poolclass": NullPool,
        "connect_args": {"statement_cache_size": 0},
    }


engine = create_async_engine(
    settings.database_url, echo=False, **_engine_options(settings.database_url)
)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
