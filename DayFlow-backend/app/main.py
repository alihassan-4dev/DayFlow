from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai, auth, tasks
from app.core.config import get_settings
from app.db import models  # noqa: F401 — register models with Base.metadata
from app.db.base import Base, engine

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.app_environment != "production":
        # Local artifacts (SQLite fallback, mem0 store) live under ./data.
        Path("data").mkdir(exist_ok=True)
        # Convenience for development and tests. Production uses Alembic.
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
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


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "app": settings.app_name}
