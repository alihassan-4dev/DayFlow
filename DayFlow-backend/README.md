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

## Deploy to FastAPI Cloud

1. Create a Neon Postgres database and copy its connection URL.
2. Apply migrations from this directory:

   ```powershell
   $env:DATABASE_URL="postgresql://..."
   uv run alembic upgrade head
   ```

3. Run `uv run fastapi deploy`, or connect GitHub and set the application
   directory to `DayFlow-backend`.
4. Add these FastAPI Cloud variables/secrets:

   - `APP_ENVIRONMENT=production`
   - `APP_DEBUG=false`
   - `DATABASE_URL`
   - a random 32+ character `JWT_SECRET`
   - `GROQ_API_KEY`
   - `PUSH_NOTIFICATIONS_ENABLED=true`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`
   - optionally `EXPO_PUSH_ACCESS_TOKEN` if Expo enhanced push security is enabled
   - optionally `MEM0_API_KEY` for hosted AI memory

Production intentionally does not create tables on application startup. Run
`uv run alembic upgrade head` for every schema deployment.

## AI push reminder flow

The mobile app registers its Expo push token at `POST /notifications/devices`
and syncs timing/tone at `PUT /notifications/preferences`. FastAPI Cloud may scale
to zero, so free Upstash QStash invokes the worker instead of an in-process timer.

Create a QStash schedule:

- Destination: `https://<app>.fastapicloud.dev/internal/notifications/process`
- Method: `POST`
- Cron: `* * * * *`
- Body: `{}`

The endpoint verifies the QStash signature, finds incomplete due tasks, asks
Groq for a fresh short reminder, and hands it to Expo Push. There are no local
task notification timers and no hard-coded message fallback. If AI generation
fails, the attempt is recorded and retried rather than sending a template.

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

## Verification

```powershell
uv run pytest
uv run alembic upgrade head
```
