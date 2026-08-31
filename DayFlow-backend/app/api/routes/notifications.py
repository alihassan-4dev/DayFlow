import secrets

from fastapi import APIRouter, Header, HTTPException, Request, status
from qstash import Receiver
from sqlalchemy import select

from app.api.deps import CurrentUser, DbDep
from app.core.config import get_settings
from app.db.models import PushToken
from app.schemas.notifications import (
    NotificationPreferencesRequest,
    PushTokenDelete,
    PushTokenRequest,
    PushTokenResponse,
)
from app.services.notifications import process_due_notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])
internal_router = APIRouter(prefix="/internal/notifications", tags=["internal"])


@router.post("/devices", response_model=PushTokenResponse)
async def register_device(
    payload: PushTokenRequest, user: CurrentUser, db: DbDep
) -> PushTokenResponse:
    device = await db.scalar(select(PushToken).where(PushToken.token == payload.token))
    if device is None:
        device = PushToken(
            user_id=user.id,
            token=payload.token,
            platform=payload.platform,
        )
        db.add(device)
    else:
        if device.active and device.user_id != user.id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Device is registered to another account")
        device.user_id = user.id
        device.platform = payload.platform
        device.active = True
    user.timezone = payload.timezone
    await db.commit()
    return PushTokenResponse()


@router.delete("/devices", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_device(payload: PushTokenDelete, user: CurrentUser, db: DbDep) -> None:
    device = await db.scalar(
        select(PushToken).where(
            PushToken.token == payload.token,
            PushToken.user_id == user.id,
        )
    )
    if device is not None:
        device.active = False
        await db.commit()


@router.put("/preferences", status_code=status.HTTP_204_NO_CONTENT)
async def update_preferences(
    payload: NotificationPreferencesRequest, user: CurrentUser, db: DbDep
) -> None:
    user.notifications_enabled = payload.enabled
    user.notification_tone = payload.tone
    user.remind_before = payload.remind_before
    user.timezone = payload.timezone
    user.quiet_hours_enabled = payload.quiet_hours_enabled
    user.quiet_start = payload.quiet_start
    user.quiet_end = payload.quiet_end
    user.daily_summary_enabled = payload.daily_summary_enabled
    user.daily_summary_time = payload.daily_summary_time
    await db.commit()


def _verify_scheduler_request(body: str, signature: str | None, url: str,
                              scheduler_secret: str | None) -> None:
    settings = get_settings()
    if settings.internal_scheduler_secret and scheduler_secret and secrets.compare_digest(
        settings.internal_scheduler_secret, scheduler_secret
    ):
        return
    if not signature or not settings.qstash_current_signing_key or not settings.qstash_next_signing_key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid scheduler credentials")
    try:
        Receiver(
            current_signing_key=settings.qstash_current_signing_key,
            next_signing_key=settings.qstash_next_signing_key,
        ).verify(signature=signature, body=body, url=url)
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid QStash signature") from exc


@internal_router.post("/process")
async def process_notifications(
    request: Request,
    db: DbDep,
    upstash_signature: str | None = Header(default=None),
    x_scheduler_secret: str | None = Header(default=None),
) -> dict[str, int | bool]:
    body = (await request.body()).decode("utf-8")
    _verify_scheduler_request(body, upstash_signature, str(request.url), x_scheduler_secret)
    result = await process_due_notifications(db)
    return {"enabled": get_settings().push_notifications_enabled, **result}
