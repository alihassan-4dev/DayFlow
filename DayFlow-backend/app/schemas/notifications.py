from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator


def _check_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError("timezone must be a valid IANA timezone") from exc
    return value


class PushTokenRequest(BaseModel):
    token: str = Field(min_length=20, max_length=255, pattern=r"^(Expo|Exponent)PushToken\[.+\]$")
    platform: Literal["android", "ios"]
    timezone: str = Field(min_length=1, max_length=64)

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        return _check_timezone(value)


class PushTokenDelete(BaseModel):
    token: str = Field(min_length=20, max_length=255)


class NotificationPreferencesRequest(BaseModel):
    enabled: bool
    tone: Literal["motivational", "friendly", "minimal"]
    remind_before: Literal[10, 20, 30]
    timezone: str = Field(min_length=1, max_length=64)
    # Optional so an older app build keeps working against a newer backend.
    quiet_hours_enabled: bool = True
    quiet_start: str = Field(default="22:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    quiet_end: str = Field(default="07:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    daily_summary_enabled: bool = True
    daily_summary_time: str = Field(default="08:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        return _check_timezone(value)


class PushTokenResponse(BaseModel):
    registered: bool = True
