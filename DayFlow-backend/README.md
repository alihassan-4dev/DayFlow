# DayFlow — Backend

FastAPI backend for the DayFlow app: JWT auth, task CRUD, and an AI assistant
(LangChain + Groq tool-calling) with local long-term memory (mem0 OSS).

**Stack:** FastAPI · SQLAlchemy 2 (async) · Alembic · Neon Postgres (SQLite fallback) ·
LangChain + Groq · mem0 (local: Groq + sentence-transformers + Chroma) · uv

## Setup

```bash
uv sync                       # API + development/test dependencies
# Optional local mem0 embeddings/Chroma support:
uv sync --group local-memory
copy .env.example .env        # then fill in the values
uv run alembic upgrade head   # create tables (Neon or local SQLite)
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Interactive API docs: http://localhost:8000/docs

### .env essentials

| Variable       | What                                                             |
| -------------- | ---------------------------------------------------------------- |
| `APP_ENVIRONMENT` | `development`, `test`, or `production`.                     |
| `APP_DEBUG`    | Enable FastAPI debug responses locally; always `false` in production. |
| `DATABASE_URL` | Neon connection string, pasted as-is (auto-adapted for asyncpg). Empty = local SQLite. |
| `JWT_SECRET`   | A random value of at least 32 characters in production.          |
| `GROQ_API_KEY` | Key from https://console.groq.com — powers the assistant.         |
| `MEM0_API_KEY` | Optional. Set to use hosted mem0 instead of local memory.         |
| `LOCAL_MEMORY_ENABLED` | Set `true` only after installing the `local-memory` group. |
| `CORS_ORIGINS` | JSON list of allowed web origins, for example `["https://example.com"]`. |

Without `GROQ_API_KEY` the API still runs; `/ai/chat` returns a friendly
"not configured" reply and tasks work normally.

## Endpoints

- `POST /auth/signup` · `POST /auth/login` · `POST /auth/forgot-password` · `GET /auth/me`
- `GET|POST /tasks` · `PATCH|DELETE /tasks/{id}`
- `POST /ai/chat` — the assistant can create, reschedule, complete, and delete
  the user's tasks via tool calls; the response carries the refreshed task list.
- `GET /health`

## Deploy to FastAPI Cloud

The project uses FastAPI Cloud's supported `pyproject.toml` + `uv.lock` workflow.
The ASGI entrypoint is explicitly configured as `app.main:app`, Python is pinned
to 3.12, and `.fastapicloudignore` excludes secrets and local-only artifacts.

1. Create a production Postgres database (Neon works) and copy its connection URL.
2. From `DayFlow-backend`, apply the schema to that database before the first deploy:

   ```bash
   $env:DATABASE_URL="postgresql://..."  # PowerShell
   uv run alembic upgrade head
   ```

3. Deploy from the backend directory with `uv run fastapi deploy`. If deploying
   through GitHub, set the FastAPI Cloud Application Directory to `DayFlow-backend`.
4. In FastAPI Cloud, configure:
   - `APP_ENVIRONMENT=production`
   - `APP_DEBUG=false`
   - `DATABASE_URL` as a secret
   - `JWT_SECRET` as a secret (generate with `python -c "import secrets; print(secrets.token_hex(32))"`)
   - `GROQ_API_KEY` as a secret
   - `MEM0_API_KEY` as an optional secret for durable hosted memory
   - `CORS_ORIGINS` as a JSON list if a browser frontend will call the API
5. Set the mobile app's `EXPO_PUBLIC_API_URL` to the resulting
   `https://<app>.fastapicloud.dev` URL and make a new app build.

Production intentionally does not create tables during application startup.
Run Alembic separately for each schema change so gradual deployments stay safe.
Local sentence-transformer/Chroma memory is not installed in the cloud; use hosted
mem0 for durable memory, or leave `MEM0_API_KEY` empty to run without memory.

## Tests & migrations

```bash
uv run pytest                                   # runs against a throwaway SQLite db
uv run alembic revision --autogenerate -m "..." # after model changes
uv run alembic upgrade head
```
