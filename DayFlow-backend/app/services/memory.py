"""Long-term user memory via the local mem0 SDK.

When LOCAL_MEMORY_ENABLED is true, Groq extracts memories, a local
sentence-transformers model embeds them, and Chroma persists them on disk
(./data/mem0). If MEM0_API_KEY is set, the hosted mem0 platform is used
instead. Otherwise memory quietly turns off — the assistant still works,
it just doesn't remember across sessions.

All calls here are synchronous (the local SDK is sync); the AI service
runs them in a thread so the event loop never blocks.
"""

import logging
from functools import lru_cache

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def _client():
    settings = get_settings()

    # Hosted platform, if the user opted into it.
    if settings.mem0_api_key:
        try:
            from mem0 import MemoryClient

            return MemoryClient(api_key=settings.mem0_api_key)
        except Exception:
            logger.exception("mem0 platform client failed; trying local")

    # Local OSS mem0 is opt-in because its model/vector dependencies are large.
    if not settings.local_memory_enabled or not settings.groq_api_key:
        return None
    try:
        from mem0 import Memory

        return Memory.from_config(
            {
                "llm": {
                    "provider": "groq",
                    "config": {
                        "model": settings.groq_model,
                        "api_key": settings.groq_api_key,
                        "temperature": 0.1,
                        "max_tokens": 1000,
                    },
                },
                "embedder": {
                    "provider": "huggingface",
                    "config": {"model": "sentence-transformers/all-MiniLM-L6-v2"},
                },
                "vector_store": {
                    "provider": "chroma",
                    "config": {
                        "collection_name": "dayflow_memories",
                        "path": "./data/mem0",
                    },
                },
                "history_db_path": "./data/mem0/history.db",
            }
        )
    except Exception:
        logger.exception("local mem0 could not start; memory disabled")
        return None


def recall(user_id: int, query: str, limit: int = 5) -> list[str]:
    client = _client()
    if client is None:
        return []
    try:
        results = client.search(query, user_id=f"dayflow-{user_id}", limit=limit)
        # Local SDK returns {"results": [...]}; the platform client returns a list.
        if isinstance(results, dict):
            results = results.get("results", [])
        return [r["memory"] for r in results if isinstance(r, dict) and r.get("memory")]
    except Exception:
        logger.exception("mem0 search failed")
        return []


def remember(user_id: int, user_message: str, ai_reply: str) -> None:
    client = _client()
    if client is None:
        return
    try:
        client.add(
            [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": ai_reply},
            ],
            user_id=f"dayflow-{user_id}",
        )
    except Exception:
        logger.exception("mem0 add failed")
