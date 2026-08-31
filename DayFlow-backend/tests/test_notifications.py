from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import get_settings
from app.services import notifications as notification_service


TOKEN = "ExponentPushToken[test-device-token-123456789]"


def preferences(**overrides) -> dict:
    """Notification preferences with quiet hours off, so tests do not depend on
    the wall-clock time they happen to run at."""
    return {
        "enabled": True,
        "tone": "motivational",
        "remind_before": 10,
        "timezone": "UTC",
        "quiet_hours_enabled": False,
        "daily_summary_enabled": False,
        **overrides,
    }


async def setup_device(client, auth_headers, **pref_overrides) -> None:
    registered = await client.post(
        "/notifications/devices",
        headers=auth_headers,
        json={"token": TOKEN, "platform": "android", "timezone": "UTC"},
    )
    assert registered.status_code == 200, registered.text
    updated = await client.put(
        "/notifications/preferences",
        headers=auth_headers,
        json=preferences(**pref_overrides),
    )
    assert updated.status_code == 204, updated.text


async def create_task(client, auth_headers, due: datetime, title: str = "Finish the report") -> int:
    task = await client.post(
        "/tasks",
        headers=auth_headers,
        json={
            "title": title,
            "due_date": due.date().isoformat(),
            "time": due.strftime("%H:%M"),
            "priority": "high",
            "reminder": True,
        },
    )
    assert task.status_code == 201, task.text
    return task.json()["id"]


@pytest.fixture
def push_spy(monkeypatch):
    """Capture what the worker would have sent, without touching Groq or Expo."""
    settings = get_settings()
    monkeypatch.setattr(settings, "push_notifications_enabled", True)
    sent: list[dict] = []

    async def fake_reminder(task, user, kind="task_reminder"):
        return f"🚀 {kind} for {task.title}"

    async def fake_summary(user, tasks):
        return f"🌤️ {len(tasks)} tasks today"

    async def fake_send(token, message, task_id, kind="task_reminder"):
        sent.append({"token": token, "message": message, "task_id": task_id, "kind": kind})
        return "sent", f"expo-ticket-{len(sent)}", None

    monkeypatch.setattr(notification_service, "generate_reminder_message", fake_reminder)
    monkeypatch.setattr(notification_service, "generate_summary_message", fake_summary)
    monkeypatch.setattr(notification_service, "send_expo_push", fake_send)
    monkeypatch.setattr(notification_service, "check_expo_receipts", lambda *a, **k: _zero())
    return sent


async def _zero():
    return 0, 0


@pytest.mark.asyncio
async def test_register_update_and_unregister_device(client, auth_headers):
    registered = await client.post(
        "/notifications/devices",
        headers=auth_headers,
        json={"token": TOKEN, "platform": "android", "timezone": "Asia/Karachi"},
    )
    assert registered.status_code == 200
    assert registered.json() == {"registered": True}

    updated = await client.put(
        "/notifications/preferences",
        headers=auth_headers,
        json=preferences(tone="friendly", timezone="Asia/Karachi"),
    )
    assert updated.status_code == 204

    removed = await client.request(
        "DELETE",
        "/notifications/devices",
        headers=auth_headers,
        json={"token": TOKEN},
    )
    assert removed.status_code == 204


@pytest.mark.asyncio
async def test_preferences_accept_an_older_app_build(client, auth_headers):
    """A build that predates quiet hours omits the new fields and still works."""
    response = await client.put(
        "/notifications/preferences",
        headers=auth_headers,
        json={
            "enabled": True,
            "tone": "friendly",
            "remind_before": 20,
            "timezone": "Asia/Karachi",
        },
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_scheduler_requires_authentication(client):
    response = await client.post("/internal/notifications/process", json={})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_due_task_gets_one_ai_push(client, auth_headers, push_spy):
    await setup_device(client, auth_headers)
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    task_id = await create_task(client, auth_headers, now + timedelta(minutes=10))

    headers = {"X-Scheduler-Secret": "test-scheduler-secret"}
    first = await client.post("/internal/notifications/process", headers=headers, json={})
    second = await client.post("/internal/notifications/process", headers=headers, json={})

    assert first.status_code == 200, first.text
    assert first.json()["notifications_sent"] == 1
    assert second.json()["notifications_sent"] == 0, "a retried scheduler call must not resend"
    assert push_spy == [
        {
            "token": TOKEN,
            "message": "🚀 task_reminder for Finish the report",
            "task_id": task_id,
            "kind": "task_reminder",
        }
    ]


@pytest.mark.asyncio
async def test_task_escalates_through_three_stages(client, auth_headers, db, push_spy):
    """Ahead of time, at the start, then once more while still open — and no more."""
    await setup_device(client, auth_headers)
    due = datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=1)
    task_id = await create_task(client, auth_headers, due)

    for moment in (due - timedelta(minutes=10), due, due + timedelta(minutes=30)):
        await notification_service.process_due_notifications(db, now=moment)
    # A fourth pass an hour later has nothing left to send.
    await notification_service.process_due_notifications(db, now=due + timedelta(minutes=90))

    assert [push["kind"] for push in push_spy] == ["task_reminder", "task_due", "task_overdue"]
    assert {push["task_id"] for push in push_spy} == {task_id}


@pytest.mark.asyncio
async def test_completed_task_stops_escalating(client, auth_headers, db, push_spy):
    await setup_device(client, auth_headers)
    due = datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=1)
    task_id = await create_task(client, auth_headers, due)

    await notification_service.process_due_notifications(db, now=due - timedelta(minutes=10))
    done = await client.patch(
        f"/tasks/{task_id}", headers=auth_headers, json={"completed": True}
    )
    assert done.status_code == 200, done.text
    await notification_service.process_due_notifications(db, now=due)
    await notification_service.process_due_notifications(db, now=due + timedelta(minutes=30))

    assert [push["kind"] for push in push_spy] == ["task_reminder"]


@pytest.mark.asyncio
async def test_quiet_hours_suppress_the_push(client, auth_headers, db, push_spy):
    await setup_device(
        client, auth_headers, quiet_hours_enabled=True, quiet_start="22:00", quiet_end="07:00"
    )
    # 02:30 UTC tomorrow sits inside the 22:00 -> 07:00 window.
    due = (datetime.now(timezone.utc) + timedelta(days=1)).replace(
        hour=2, minute=30, second=0, microsecond=0
    )
    await create_task(client, auth_headers, due)

    for moment in (due - timedelta(minutes=10), due, due + timedelta(minutes=30)):
        await notification_service.process_due_notifications(db, now=moment)

    assert push_spy == []


@pytest.mark.asyncio
async def test_quiet_hours_allow_a_push_outside_the_window(client, auth_headers, db, push_spy):
    await setup_device(
        client, auth_headers, quiet_hours_enabled=True, quiet_start="22:00", quiet_end="07:00"
    )
    due = (datetime.now(timezone.utc) + timedelta(days=1)).replace(
        hour=14, minute=0, second=0, microsecond=0
    )
    await create_task(client, auth_headers, due)

    await notification_service.process_due_notifications(db, now=due)

    # Both the early nudge and the start fire: the 10-minute-earlier stage is
    # still inside the grace window at this point.
    assert [push["kind"] for push in push_spy] == ["task_reminder", "task_due"]


@pytest.mark.asyncio
async def test_daily_summary_sends_once_per_day(client, auth_headers, db, push_spy):
    await setup_device(
        client,
        auth_headers,
        daily_summary_enabled=True,
        daily_summary_time="08:00",
        quiet_hours_enabled=False,
    )
    today = datetime.now(timezone.utc).date()
    summary_at = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).replace(hour=8)
    await create_task(client, auth_headers, summary_at.replace(hour=14), title="Design review")

    await notification_service.process_due_notifications(db, now=summary_at)
    await notification_service.process_due_notifications(db, now=summary_at + timedelta(minutes=5))

    summaries = [push for push in push_spy if push["kind"] == "daily_summary"]
    assert len(summaries) == 1, "the summary must not repeat within the same day"
    assert summaries[0]["task_id"] is None
    assert summaries[0]["message"] == "🌤️ 1 tasks today"


@pytest.mark.asyncio
async def test_daily_summary_stays_quiet_with_no_tasks(client, auth_headers, db, push_spy):
    await setup_device(
        client, auth_headers, daily_summary_enabled=True, daily_summary_time="08:00"
    )
    today = datetime.now(timezone.utc).date()
    summary_at = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).replace(hour=8)

    await notification_service.process_due_notifications(db, now=summary_at)

    assert push_spy == []


@pytest.mark.asyncio
async def test_qstash_signature_survives_the_vercel_proxy(client, monkeypatch):
    """Vercel forwards to the function over http, so the signed https URL must
    still be reconstructed from the forwarded headers."""
    import base64
    import hashlib
    import hmac
    import json
    import time

    key = "sig-test-current-key"
    settings = get_settings()
    monkeypatch.setattr(settings, "qstash_current_signing_key", key)
    monkeypatch.setattr(settings, "qstash_next_signing_key", "sig-test-next-key")
    monkeypatch.setattr(settings, "internal_scheduler_secret", "")

    body = "{}"
    signed_url = "https://dayflow.vercel.app/internal/notifications/process"

    def b64(raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")

    now = int(time.time())
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    claims = b64(
        json.dumps(
            {
                "iss": "Upstash",
                "sub": signed_url,
                "exp": now + 300,
                "nbf": now - 5,
                "iat": now,
                "jti": "test-jti",
                "body": b64(hashlib.sha256(body.encode()).digest()),
            }
        ).encode()
    )
    signing_input = f"{header}.{claims}".encode()
    signature = b64(hmac.new(key.encode(), signing_input, hashlib.sha256).digest())
    token = f"{header}.{claims}.{signature}"

    response = await client.post(
        "/internal/notifications/process",
        content=body,
        headers={
            "Content-Type": "application/json",
            "Upstash-Signature": token,
            # What Vercel's edge actually adds in front of the function.
            "X-Forwarded-Proto": "https",
            "X-Forwarded-Host": "dayflow.vercel.app",
        },
    )
    assert response.status_code == 200, response.text
