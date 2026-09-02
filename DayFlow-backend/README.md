# DayFlow Backend

FastAPI API for authentication, task CRUD, the Groq assistant, and backend-driven
AI push reminders. It uses async SQLAlchemy, Alembic, Neon/Postgres in production,
and SQLite for local development.

## Local setup

```powershell
uv sync
Copy-Item .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

API documentation is available at `http://localhost:8000/docs`.

## Deploy to Vercel

Vercel serves the app as a single Python Function. It auto-detects the FastAPI
`app` in `app/main.py`; `pyproject.toml` names that entrypoint explicitly under
`[tool.vercel]`, and `vercel.json` raises `maxDuration` so the notification
worker has room to finish.

1. Create a Neon Postgres database. **Copy the pooled connection string** — the
   host containing `-pooler`. Serverless functions open connections from many
   short-lived instances, so the app uses `NullPool` and lets Neon's pooler do
   the pooling.
2. Apply migrations from this directory (never from Vercel — the function
   filesystem is read-only and migrations should be a deliberate step):

   ```powershell
   $env:DATABASE_URL="postgresql://...-pooler..."
   uv run alembic upgrade head
   ```

3. Deploy with `vercel deploy` from this directory, or import the repository in
   the dashboard and set the **Root Directory** to `DayFlow-backend`.
4. Add these Environment Variables in the Vercel project:

   - `APP_ENVIRONMENT=production`
   - `APP_DEBUG=false`
   - `DATABASE_URL` — the Neon **pooled** URL
   - a random 32+ character `JWT_SECRET`
   - `GROQ_API_KEY`
   - `PUSH_NOTIFICATIONS_ENABLED=true`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`
   - optionally `EXPO_PUSH_ACCESS_TOKEN` if Expo enhanced push security is enabled
   - optionally `MEM0_API_KEY` for hosted AI memory

   `APP_ENVIRONMENT=production` matters: without it the settings fall back to a
   local SQLite file, which cannot work on a read-only serverless filesystem.

5. Confirm the deploy with `GET /health`. It reports the environment and whether
   the app resolved a Postgres or SQLite database:

   ```json
   { "status": "ok", "environment": "production", "database": "postgres" }
   ```

Then point the frontend at the deployment by setting `EXPO_PUBLIC_API_URL` to
the Vercel URL before building the app.

Production intentionally does not create tables on application startup. Run
`uv run alembic upgrade head` for every schema deployment.

### Notes on the serverless runtime

- **No in-process scheduler.** The function only runs while serving a request,
  so reminders are driven by QStash calling the worker endpoint (below).
- **Local AI memory is unavailable.** mem0's local mode needs to write a vector
  store to disk; on Vercel it degrades to memory-off. Use `MEM0_API_KEY` for the
  hosted service if you want memory in production.
- `.vercelignore` keeps tests, the local `data/` directory, and `.env` out of the
  bundle. Secrets come from Vercel Environment Variables, never from a file.

## AI push reminder flow

The mobile app registers its Expo push token at `POST /notifications/devices`
and syncs timing/tone at `PUT /notifications/preferences`. A serverless function
only runs while handling a request, so free Upstash QStash invokes the worker
on a schedule instead of an in-process timer.

Create a QStash schedule:

- Destination: `https://<your-project>.vercel.app/internal/notifications/process`
- Method: `POST`
- Cron: `* * * * *`
- Body: `{}`

The endpoint verifies the QStash signature, finds incomplete due tasks, asks
Groq for a fresh short reminder, and hands it to Expo Push. There are no local
task notification timers and no hard-coded message fallback. If AI generation
fails, the attempt is recorded and retried rather than sending a template.

A QStash signature covers the destination URL, and Vercel's edge terminates TLS
and forwards to the function over plain HTTP. The endpoint therefore rebuilds the
public URL from `X-Forwarded-Proto`/`X-Forwarded-Host` before verifying, so the
signature still matches behind the proxy.

### Reminder policy

Each task escalates through at most three pushes, and stops the moment it is
ticked off:

| Stage | When | Kind |
| --- | --- | --- |
| Early nudge | `remind_before` minutes before the task | `task_reminder` |
| At the start | the task's own time | `task_due` |
| Still open | 30 minutes after the task | `task_overdue` |

Separately, one `daily_summary` push per day recaps the day ahead at the user's
chosen local time; it is skipped when the day holds no open task.

Every stage is evaluated in the user's own timezone. A stage whose moment falls
inside the user's quiet hours is skipped rather than deferred, so a do-not-disturb
window never turns into a backlog that arrives at once. A stage also only fires
within `NOTIFICATION_GRACE_MINUTES` of its moment, so a scheduler outage cannot
deliver a burst of stale reminders on recovery. Each (task, device, stage) pair
is reserved in `notification_deliveries` before sending, which is what makes a
retried QStash call safe.

## AI voice endpoints

All free-tier: Whisper runs on Groq (same `GROQ_API_KEY`), speech comes from
Microsoft Edge neural voices through `edge-tts` (no key; needs outbound network
from the function, which Vercel allows).

| Endpoint | Purpose |
| --- | --- |
| `POST /ai/voice` | multipart `audio` + `history`/`personality`/`voice`/`speed` → transcript, reply, task actions, base64 MP3 |
| `POST /ai/transcribe` | multipart `audio` → text |
| `POST /ai/speak` | `{text, voice, speed}` → `audio/mpeg`, or `204` when Edge is unreachable so the app can fall back to device speech |
| `GET /ai/voices` | the curated voice catalogue the app shows |

`POST /ai/chat` now also accepts `personality` (`friendly` / `focused` / `coach`)
and `voice: true`, which asks for shorter, list-free replies meant to be read aloud.

## Verification

```powershell
uv run pytest
uv run alembic upgrade head
```
