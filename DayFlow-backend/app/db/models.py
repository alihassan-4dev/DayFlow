from datetime import date, datetime, timezone
from enum import StrEnum

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint, text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Priority(StrEnum):
    high = "high"
    medium = "medium"
    low = "low"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    notification_tone: Mapped[str] = mapped_column(String(20), default="motivational")
    remind_before: Mapped[int] = mapped_column(Integer, default=20)
    quiet_hours_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    quiet_start: Mapped[str] = mapped_column(String(5), default="22:00")  # "HH:MM", local
    quiet_end: Mapped[str] = mapped_column(String(5), default="07:00")
    daily_summary_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    daily_summary_time: Mapped[str] = mapped_column(String(5), default="08:00")

    tasks: Mapped[list["Task"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    push_tokens: Mapped[list["PushToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    note: Mapped[str | None] = mapped_column(Text, default=None)
    due_date: Mapped[date] = mapped_column(Date, index=True)
    time: Mapped[str] = mapped_column(String(5), default="09:00")  # "HH:MM", 24h
    priority: Mapped[Priority] = mapped_column(Enum(Priority, native_enum=False), default=Priority.medium)
    reminder: Mapped[bool] = mapped_column(Boolean, default=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="tasks")
    deliveries: Mapped[list["NotificationDelivery"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )


class PushToken(Base):
    __tablename__ = "push_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    platform: Mapped[str] = mapped_column(String(20))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="push_tokens")
    deliveries: Mapped[list["NotificationDelivery"]] = relationship(
        back_populates="push_token", cascade="all, delete-orphan"
    )


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"
    __table_args__ = (
        UniqueConstraint(
            "task_id", "push_token_id", "kind", "scheduled_for",
            name="uq_notification_delivery_event",
        ),
        # A NULL task_id (daily summaries) compares as distinct in SQL, so the
        # constraint above cannot dedupe them. This partial index does.
        Index(
            "uq_notification_delivery_user_event",
            "user_id", "push_token_id", "kind", "scheduled_for",
            unique=True,
            sqlite_where=text("task_id IS NULL"),
            postgresql_where=text("task_id IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True, default=None
    )
    push_token_id: Mapped[int] = mapped_column(
        ForeignKey("push_tokens.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(30), default="task_reminder")
    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    message: Mapped[str | None] = mapped_column(String(240), default=None)
    status: Mapped[str] = mapped_column(String(20), default="processing", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=1)
    expo_ticket_id: Mapped[str | None] = mapped_column(String(120), default=None)
    error: Mapped[str | None] = mapped_column(String(500), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    task: Mapped[Task | None] = relationship(back_populates="deliveries")
    push_token: Mapped[PushToken] = relationship(back_populates="deliveries")
