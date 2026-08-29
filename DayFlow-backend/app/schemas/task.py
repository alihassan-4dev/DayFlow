from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.db.models import Priority

_TIME_ERROR = "time must be HH:MM (24h)"


def _validate_time(value: str) -> str:
    parts = value.split(":")
    if len(parts) != 2:
        raise ValueError(_TIME_ERROR)
    hour, minute = parts
    if not (hour.isdigit() and minute.isdigit()):
        raise ValueError(_TIME_ERROR)
    if not (0 <= int(hour) <= 23 and 0 <= int(minute) <= 59):
        raise ValueError(_TIME_ERROR)
    return f"{int(hour):02d}:{minute}"


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    note: str | None = None
    due_date: date
    time: str = "09:00"
    priority: Priority = Priority.medium
    reminder: bool = True

    @field_validator("time")
    @classmethod
    def check_time(cls, v: str) -> str:
        return _validate_time(v)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    note: str | None = None
    due_date: date | None = None
    time: str | None = None
    priority: Priority | None = None
    reminder: bool | None = None
    completed: bool | None = None

    @field_validator("time")
    @classmethod
    def check_time(cls, v: str | None) -> str | None:
        return None if v is None else _validate_time(v)


class TaskOut(BaseModel):
    id: int
    title: str
    note: str | None
    due_date: date
    time: str
    priority: Priority
    reminder: bool
    completed: bool

    model_config = {"from_attributes": True}
