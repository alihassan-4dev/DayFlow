"""add backend-driven push notifications

Revision ID: 38e1b66e7bc4
Revises: ef066890bf3d
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "38e1b66e7bc4"
down_revision: Union[str, None] = "ef066890bf3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("timezone", sa.String(length=64), server_default="UTC", nullable=False))
    op.add_column("users", sa.Column("notifications_enabled", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column("users", sa.Column("notification_tone", sa.String(length=20), server_default="motivational", nullable=False))
    op.add_column("users", sa.Column("remind_before", sa.Integer(), server_default="20", nullable=False))

    op.create_table(
        "push_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("platform", sa.String(length=20), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_push_tokens_token"), "push_tokens", ["token"], unique=True)
    op.create_index(op.f("ix_push_tokens_user_id"), "push_tokens", ["user_id"], unique=False)

    op.create_table(
        "notification_deliveries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("push_token_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=30), nullable=False),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("message", sa.String(length=240), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("expo_ticket_id", sa.String(length=120), nullable=True),
        sa.Column("error", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["push_token_id"], ["push_tokens.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "task_id", "push_token_id", "kind", "scheduled_for",
            name="uq_notification_delivery_event",
        ),
    )
    op.create_index(op.f("ix_notification_deliveries_push_token_id"), "notification_deliveries", ["push_token_id"], unique=False)
    op.create_index(op.f("ix_notification_deliveries_scheduled_for"), "notification_deliveries", ["scheduled_for"], unique=False)
    op.create_index(op.f("ix_notification_deliveries_status"), "notification_deliveries", ["status"], unique=False)
    op.create_index(op.f("ix_notification_deliveries_task_id"), "notification_deliveries", ["task_id"], unique=False)
    op.create_index(op.f("ix_notification_deliveries_user_id"), "notification_deliveries", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_table("notification_deliveries")
    op.drop_table("push_tokens")
    op.drop_column("users", "remind_before")
    op.drop_column("users", "notification_tone")
    op.drop_column("users", "notifications_enabled")
    op.drop_column("users", "timezone")
