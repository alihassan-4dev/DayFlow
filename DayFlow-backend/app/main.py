import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai, auth, notifications, tasks
from app.core.config import get_settings
from app.db import models  # noqa: F401 — register models with Base.metadata
from app.db.base import Base, engine

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Bootstrap the schema only for the local SQLite fallback. Postgres — the
    # only thing a deployment should point at — is migrated with Alembic.
    # A serverless filesystem is read-only apart from /tmp, so a misconfigured
    # deploy must not take the whole app down on a mkdir.
    if settings.app_environment != "production" and settings.database_url.startswith("sqlite"):
        try:
            # Local artifacts (SQLite fallback, mem0 store) live under ./data.
            Path("data").mkdir(exist_ok=True)
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except OSError:
            logging.getLogger(__name__).exception("Could not prepare the local SQLite database")
    yield
    await engine.dispose()


app = FastAPI(title=settings.app_name, debug=settings.app_debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(ai.router)
app.include_router(notifications.router)
app.include_router(notifications.internal_router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    """Also reports the shape of the deployment, so a misconfigured deploy —
    one still falling back to SQLite, say — is obvious without reading logs."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.app_environment,
        "database": "sqlite" if settings.database_url.startswith("sqlite") else "postgres",
        "push_notifications": settings.push_notifications_enabled,
    }
