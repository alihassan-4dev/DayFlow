"""Vercel serverless entrypoint — exposes the FastAPI ASGI app.

Vercel's Python runtime detects the `app` variable and serves it;
vercel.json rewrites every route here.
"""

from app.main import app  # noqa: F401
