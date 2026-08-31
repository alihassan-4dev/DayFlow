import logging
import re
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import NotificationDelivery, PushToken, Task, User

logger = logging.getLogger(__name__)
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"
EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF☀-➿]")

# At most three pushes per task: ahead of time, at the start, once if still open.
OVERDUE_AFTER_MINUTES = 30
STAGE_BRIEFS = {
    "task_reminder": "The task starts shortly. Nudge them to get ready.",
    "task_due": "The task starts right now. Invite them to begin.",
    "task_overdue": (
        "The task was due a little while ago and is still open. Be gentle and "
        "encouraging, never guilt-tripping."
    ),
}


class ReminderGenerationError(RuntimeError):
    """Raised when no genuine AI-written reminder can be produced."""


def _clean_message(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip().strip('"“”')
    if not value or len(value) > 160 or not EMOJI_RE.search(value):
        raise ReminderGenerationError("AI returned an invalid reminder")
    return value


async def _generate(messages: list) -> str:
    """Ask Groq for a message, retrying once if the first draft is unusable."""
    from langchain_groq import ChatGroq

    settings = get_settings()
    model = ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=0.7,
        max_tokens=80,
    )
    for _ in range(2):
        response = await model.ainvoke(messages)
        try:
            return _clean_message(str(response.content))
        except ReminderGenerationError:
            continue
    raise ReminderGenerationError("AI did not return a valid message after two attempts")


async def generate_reminder_message(task: Task, user: User, kind: str = "task_reminder") -> str:
    settings = get_settings()
    if not settings.groq_api_key:
        raise ReminderGenerationError("GROQ_API_KEY is not configured")
    try:
        messages = [
            SystemMessage(
                "Write one warm mobile task reminder. Use exactly one suitable emoji, "
                "mention the task naturally, stay under 120 characters, and use no markdown "
                "or quotation marks. Never shame or pressure the user."
            ),
            HumanMessage(
                f"Name: {user.name or 'friend'}\nTask: {task.title}\n"
                f"Tone: {user.notification_tone}\n"
                f"Situation: {STAGE_BRIEFS.get(kind, STAGE_BRIEFS['task_reminder'])}"
            ),
        ]
        return await _generate(messages)
    except ReminderGenerationError:
        raise
    except Exception as exc:
        logger.exception("Could not generate AI reminder")
        raise ReminderGenerationError("AI reminder generation failed") from exc


async def generate_summary_message(user: User, tasks: list[Task]) -> str:
    """One short AI line describing the day ahead."""
    settings = get_settings()
    if not settings.groq_api_key:
        raise ReminderGenerationError("GROQ_API_KEY is not configured")
    try:
        listed = "\n".join(f"- {t.time} {t.title} ({t.priority})" for t in tasks)
        messages = [
            SystemMessage(
                "Write one warm mobile summary of the day ahead. Use exactly one suitable "
                "emoji, stay under 120 characters, and use no markdown or quotation marks. "
                "Say how many tasks there are and name the first one if it helps. "
                "Never shame or pressure the user."
            ),
            HumanMessage(
                f"Name: {user.name or 'friend'}\nTone: {user.notification_tone}\n"
                f"Tasks today ({len(tasks)}):\n{listed}"
            ),
        ]
        return await _generate(messages)
    except ReminderGenerationError:
        raise
    except Exception as exc:
        logger.exception("Could not generate AI daily summary")
        raise ReminderGenerationError("AI summary generation failed") from exc


async def send_expo_push(
    token: str, message: str, task_id: int | None, kind: str = "task_reminder"
) -> tuple[str, str | None, str | None]:
    settings = get_settings()
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if settings.expo_push_access_token:
        headers["Authorization"] = f"Bearer {settings.expo_push_access_token}"
    data: dict[str, str] = {"type": kind}
    if task_id is not None:
        data["taskId"] = str(task_id)
    payload = {
        "to": token,
        "title": "DayFlow",
        "body": message,
        "sound": "default",
        "priority": "high",
        "channelId": "task-reminders",
        "ttl": 1800,
        "data": data,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(EXPO_PUSH_URL, headers=headers, json=payload)
        response.raise_for_status()
    body = response.json().get("data", {})
    if body.get("status") == "ok":
        return "sent", body.get("id"), None
    details = body.get("details") or {}
    error = details.get("error") or body.get("message") or "Expo rejected the notification"
    status_value = "unregistered" if error == "DeviceNotRegistered" else "failed"
    return status_value, None, str(error)[:500]


async def check_expo_receipts(db: AsyncSession, now: datetime) -> tuple[int, int]:
    """Resolve accepted Expo tickets and deactivate permanently invalid devices."""
    rows = (await db.execute(
        select(NotificationDelivery, PushToken)
        .join(PushToken, PushToken.id == NotificationDelivery.push_token_id)
        .where(
            NotificationDelivery.status == "sent",
            NotificationDelivery.expo_ticket_id.is_not(None),
            NotificationDelivery.updated_at <= now - timedelta(minutes=15),
        )
        .limit(300)
    )).all()
    if not rows:
        return 0, 0

    settings = get_settings()
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if settings.expo_push_access_token:
        headers["Authorization"] = f"Bearer {settings.expo_push_access_token}"
    ids = [delivery.expo_ticket_id for delivery, _ in rows if delivery.expo_ticket_id]
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(EXPO_RECEIPTS_URL, headers=headers, json={"ids": ids})
        response.raise_for_status()
    receipts = response.json().get("data", {})

    checked = failed = 0
    for delivery, token in rows:
        receipt = receipts.get(delivery.expo_ticket_id)
        if not receipt:
            continue
        checked += 1
        if receipt.get("status") == "ok":
            delivery.status = "delivered"
            continue
        failed += 1
        details = receipt.get("details") or {}
        error = details.get("error") or receipt.get("message") or "Expo delivery failed"
        delivery.status = "unregistered" if error == "DeviceNotRegistered" else "failed"
        delivery.error = str(error)[:500]
        if error == "DeviceNotRegistered":
            token.active = False
    await db.commit()
    return checked, failed


# --- Scheduling --------------------------------------------------------------


def _zone(user: User) -> ZoneInfo | None:
    try:
        return ZoneInfo(user.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        return None


def _local_at(day: date, hhmm: str, zone: ZoneInfo) -> datetime:
    return datetime.combine(day, time.fromisoformat(hhmm), tzinfo=zone)


def _stage_times(task: Task, user: User) -> list[tuple[str, datetime]]:
    """The up-to-three UTC moments a single task may be pushed at."""
    zone = _zone(user)
    if zone is None:
        return []
    try:
        due = _local_at(task.due_date, task.time, zone)
    except ValueError:
        return []
    return [
        ("task_reminder", (due - timedelta(minutes=user.remind_before)).astimezone(timezone.utc)),
        ("task_due", due.astimezone(timezone.utc)),
        ("task_overdue", (due + timedelta(minutes=OVERDUE_AFTER_MINUTES)).astimezone(timezone.utc)),
    ]


def _in_quiet_hours(user: User, moment: datetime) -> bool:
    """True when the user's local time falls inside their do-not-disturb window."""
    if not user.quiet_hours_enabled:
        return False
    zone = _zone(user)
    if zone is None:
        return False
    try:
        start = time.fromisoformat(user.quiet_start)
        end = time.fromisoformat(user.quiet_end)
    except ValueError:
        return False
    if start == end:
        return False
    local = moment.astimezone(zone).time()
    if start < end:  # a window inside one day, e.g. 01:00 -> 06:00
        return start <= local < end
    return local >= start or local < end  # wraps midnight, e.g. 22:00 -> 07:00


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def _is_due_now(scheduled_for: datetime, now: datetime, grace_minutes: int) -> bool:
    """Fire once the moment has passed, but never long after it — a scheduler
    outage must not deliver a burst of stale reminders on recovery."""
    return now - timedelta(minutes=grace_minutes) <= scheduled_for <= now


async def _reserve_delivery(
    db: AsyncSession,
    user: User,
    token: PushToken,
    kind: str,
    scheduled_for: datetime,
    now: datetime,
    task: Task | None = None,
) -> NotificationDelivery | None:
    """Claim this (task, device, stage) slot, or return None when it is already
    taken — so a retried scheduler call cannot send the same push twice."""
    task_id = task.id if task is not None else None
    delivery = await db.scalar(
        select(NotificationDelivery).where(
            NotificationDelivery.task_id.is_(None)
            if task_id is None
            else NotificationDelivery.task_id == task_id,
            NotificationDelivery.user_id == user.id,
            NotificationDelivery.push_token_id == token.id,
            NotificationDelivery.kind == kind,
            NotificationDelivery.scheduled_for == scheduled_for,
        )
    )
    if delivery is not None:
        retryable = delivery.status == "failed" and delivery.attempts < 3
        stale = delivery.status == "processing" and _aware(delivery.updated_at) < now - timedelta(minutes=5)
        if not retryable and not stale:
            return None
        delivery.status = "processing"
        delivery.attempts += 1
        delivery.error = None
        await db.commit()
        return delivery

    delivery = NotificationDelivery(
        user_id=user.id,
        task_id=task_id,
        push_token_id=token.id,
        kind=kind,
        scheduled_for=scheduled_for,
    )
    db.add(delivery)
    try:
        await db.commit()
        await db.refresh(delivery)
        return delivery
    except IntegrityError:
        await db.rollback()
        return None


async def _active_tokens(db: AsyncSession, user: User) -> list[PushToken]:
    return list(await db.scalars(
        select(PushToken).where(PushToken.user_id == user.id, PushToken.active.is_(True))
    ))


async def _reserve_all(
    db: AsyncSession,
    user: User,
    kind: str,
    scheduled_for: datetime,
    now: datetime,
    task: Task | None = None,
) -> list[tuple[PushToken, NotificationDelivery]]:
    reservations = []
    for token in await _active_tokens(db, user):
        delivery = await _reserve_delivery(db, user, token, kind, scheduled_for, now, task=task)
        if delivery is not None:
            reservations.append((token, delivery))
    return reservations


async def _deliver(
    db: AsyncSession,
    reservations: list[tuple[PushToken, NotificationDelivery]],
    message: str,
    task_id: int | None,
    kind: str,
) -> tuple[int, int]:
    sent = failed = 0
    for token, delivery in reservations:
        try:
            delivery.status, delivery.expo_ticket_id, delivery.error = await send_expo_push(
                token.token, message, task_id, kind
            )
        except Exception as exc:
            logger.exception("Expo push request failed")
            delivery.status = "failed"
            delivery.error = str(exc)[:500]
        delivery.message = message
        if delivery.status == "sent":
            sent += 1
        else:
            failed += 1
        if delivery.status == "unregistered":
            token.active = False
        await db.commit()
    return sent, failed


async def _fail(
    db: AsyncSession, reservations: list[tuple[PushToken, NotificationDelivery]], reason: str
) -> int:
    for _, delivery in reservations:
        delivery.status = "failed"
        delivery.error = reason[:500]
    await db.commit()
    return len(reservations)


async def _process_task_reminders(db: AsyncSession, now: datetime) -> dict[str, int]:
    settings = get_settings()
    rows = await db.execute(
        select(Task, User)
        .join(User, User.id == Task.user_id)
        .where(
            Task.completed.is_(False),
            Task.reminder.is_(True),
            User.notifications_enabled.is_(True),
            Task.due_date >= now.date() - timedelta(days=2),
            Task.due_date <= now.date() + timedelta(days=2),
        )
    )
    checked = sent = failed = 0
    for task, user in rows.all():
        checked += 1
        for kind, scheduled_for in _stage_times(task, user):
            if not _is_due_now(scheduled_for, now, settings.notification_grace_minutes):
                continue
            if _in_quiet_hours(user, scheduled_for):
                continue
            reservations = await _reserve_all(db, user, kind, scheduled_for, now, task=task)
            if not reservations:
                continue
            try:
                message = await generate_reminder_message(task, user, kind)
            except ReminderGenerationError as exc:
                failed += await _fail(db, reservations, str(exc))
                continue
            stage_sent, stage_failed = await _deliver(db, reservations, message, task.id, kind)
            sent += stage_sent
            failed += stage_failed
    return {"tasks_checked": checked, "notifications_sent": sent, "notifications_failed": failed}


async def _process_daily_summaries(db: AsyncSession, now: datetime) -> dict[str, int]:
    settings = get_settings()
    users = list(await db.scalars(
        select(User).where(
            User.notifications_enabled.is_(True),
            User.daily_summary_enabled.is_(True),
        )
    ))
    sent = failed = 0
    for user in users:
        zone = _zone(user)
        if zone is None:
            continue
        local_today = now.astimezone(zone).date()
        try:
            scheduled_for = _local_at(
                local_today, user.daily_summary_time, zone
            ).astimezone(timezone.utc)
        except ValueError:
            continue
        if not _is_due_now(scheduled_for, now, settings.notification_grace_minutes):
            continue
        if _in_quiet_hours(user, scheduled_for):
            continue
        tasks = list(await db.scalars(
            select(Task)
            .where(
                Task.user_id == user.id,
                Task.due_date == local_today,
                Task.completed.is_(False),
            )
            .order_by(Task.time)
        ))
        if not tasks:
            continue  # nothing to summarise — stay quiet rather than send an empty nudge
        reservations = await _reserve_all(db, user, "daily_summary", scheduled_for, now)
        if not reservations:
            continue
        try:
            message = await generate_summary_message(user, tasks)
        except ReminderGenerationError as exc:
            failed += await _fail(db, reservations, str(exc))
            continue
        summary_sent, summary_failed = await _deliver(
            db, reservations, message, None, "daily_summary"
        )
        sent += summary_sent
        failed += summary_failed
    return {"summaries_sent": sent, "summaries_failed": failed}


async def process_due_notifications(
    db: AsyncSession, now: datetime | None = None
) -> dict[str, int]:
    settings = get_settings()
    if not settings.push_notifications_enabled:
        return {
            "tasks_checked": 0,
            "notifications_sent": 0,
            "notifications_failed": 0,
            "summaries_sent": 0,
            "summaries_failed": 0,
            "receipts_checked": 0,
        }

    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    receipts_checked = 0
    try:
        receipts_checked, _ = await check_expo_receipts(db, now)
    except Exception:
        logger.exception("Could not check Expo push receipts")

    reminders = await _process_task_reminders(db, now)
    summaries = await _process_daily_summaries(db, now)
    return {**reminders, **summaries, "receipts_checked": receipts_checked}
