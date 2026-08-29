# DayFlow — Backend

FastAPI backend for the DayFlow app: JWT auth, task CRUD, and an AI assistant
(LangChain + Groq tool-calling) with local long-term memory (mem0 OSS).

**Stack:** FastAPI · SQLAlchemy 2 (async) · Alembic · Neon Postgres (SQLite fallback) ·
LangChain + Groq · mem0 (local: Groq + sentence-transformers + Chroma) · uv

## Setup

```bash
uv sync                       # install everything
copy .env.example .env        # then fill in the values
uv run alembic upgrade head   # create tables (Neon or local SQLite)
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Interactive API docs: http://localhost:8000/docs

### .env essentials

| Variable       | What                                                             |
| -------------- | ---------------------------------------------------------------- |
| `DATABASE_URL` | Neon connection string, pasted as-is (auto-adapted for asyncpg). Empty = local SQLite. |
| `JWT_SECRET`   | Any long random string.                                          |
| `GROQ_API_KEY` | Free key from https://console.groq.com — powers the assistant *and* local memory. |
| `MEM0_API_KEY` | Optional. Set to use hosted mem0 instead of the local SDK.       |

Without `GROQ_API_KEY` the API still runs; `/ai/chat` returns a friendly
"not configured" reply and tasks work normally.

## Endpoints

- `POST /auth/signup` · `POST /auth/login` · `POST /auth/forgot-password` · `GET /auth/me`
- `GET|POST /tasks` · `PATCH|DELETE /tasks/{id}`
- `POST /ai/chat` — the assistant can create, reschedule, complete, and delete
  the user's tasks via tool calls; the response carries the refreshed task list.
- `GET /health`

## Deploy to Vercel (free)

The repo ships Vercel-ready: [vercel.json](vercel.json) routes everything to the
ASGI entrypoint [api/index.py](api/index.py), and [requirements.txt](requirements.txt)
holds the serverless dependency set.

1. Push the monorepo to GitHub.
2. On https://vercel.com → **Add New → Project** → import the repo.
3. Set **Root Directory** to `DayFlow-backend` (Framework preset: Other).
4. Add Environment Variables:
   - `DATABASE_URL` — your Neon connection string (paste as-is)
   - `JWT_SECRET` — a long random string
   - `GROQ_API_KEY` — from console.groq.com
   - `MEM0_API_KEY` — optional (hosted memory; see note below)
5. Deploy. Your API lives at `https://<project>.vercel.app` — point the app at it
   via `EXPO_PUBLIC_API_URL` in the frontend `.env` / `eas.json`.

**Memory on Vercel:** the local mem0 stack (sentence-transformers + Chroma) is too
heavy for serverless, so it's a local-only dependency group. On Vercel, set
`MEM0_API_KEY` to keep long-term memory via the hosted mem0 platform, or leave it
unset — the assistant works fine without memory.

## Tests & migrations

```bash
uv run pytest                                   # runs against a throwaway SQLite db
uv run alembic revision --autogenerate -m "..." # after model changes
uv run alembic upgrade head
```
