# DayFlow

**Tell DayFlow what you need to do — it helps manage your day intelligently.**

A clean, premium AI-powered daily task manager. React Native app + FastAPI backend,
with a Groq-powered assistant that can create, reschedule, and complete your tasks
through natural conversation, and long-term memory via mem0.

> Open source under the [MIT license](LICENSE).

## Monorepo layout

```
DayFlow-frontend/   React Native · Expo SDK 54 · TypeScript · Expo Router
DayFlow-backend/    FastAPI · SQLAlchemy 2 (async) · Alembic · Neon Postgres
                    LangChain + Groq · mem0 · uv
```

## Quick start

**Backend** (Python 3.12, [uv](https://docs.astral.sh/uv/)):

```bash
cd DayFlow-backend
uv sync
copy .env.example .env          # fill in DATABASE_URL (Neon) + GROQ_API_KEY
uv run alembic upgrade head
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend** (Node 20+, npm):

```bash
cd DayFlow-frontend
npm install
copy .env.example .env          # point EXPO_PUBLIC_API_URL at your backend
npx expo start                  # scan the QR with Expo Go
```

Each package's README has the full details, including deploying the backend to
Vercel and building an APK with EAS.

## Features

- Email/password auth (JWT), onboarding, task CRUD with priorities & reminders
- AI assistant: tool-calling agent (Groq `llama-3.3-70b-versatile` via LangChain)
  that operates directly on your tasks
- Long-term memory: local mem0 (Groq + local embeddings + Chroma) or hosted mem0
- Six-theme design system (Paper default, Ink, Aurora, Ocean, Forest, Carbon/OLED)
- Works offline in demo mode when the backend is unreachable
