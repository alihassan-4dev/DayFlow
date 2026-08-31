"""quiet hours, multi-stage reminders and the daily summary

Revision ID: 7c4a9b21d5e0
Revises: 38e1b66e7bc4
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7c4a9b21d5e0"
down_revision: Union[str, None] = "38e1b66e7bc4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("quiet_hours_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.add_column(
        "users", sa.Column("quiet_start", sa.String(length=5), server_default="22:00", nullable=False)
    )
    op.add_column(
        "users", sa.Column("quiet_end", sa.String(length=5), server_default="07:00", nullable=False)
    )
    op.add_column(
        "users",
        sa.Column("daily_summary_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("daily_summary_time", sa.String(length=5), server_default="08:00", nullable=False),
    )

    # A daily summary belongs to the user, not to any single task.
    with op.batch_alter_table("notification_deliveries") as batch:
        batch.alter_column("task_id", existing_type=sa.Integer(), nullable=True)

    # NULL task_id compares as distinct in SQL, so uq_notification_delivery_event
    # cannot dedupe summaries. This partial index does.
    op.create_index(
        "uq_notification_delivery_user_event",
        "notification_deliveries",
        ["user_id", "push_token_id", "kind", "scheduled_for"],
        unique=True,
        sqlite_where=sa.text("task_id IS NULL"),
        postgresql_where=sa.text("task_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_notification_delivery_user_event", table_name="notification_deliveries")
    op.execute("DELETE FROM notification_deliveries WHERE task_id IS NULL")
    with op.batch_alter_table("notification_deliveries") as batch:
        batch.alter_column("task_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("users", "daily_summary_time")
    op.drop_column("users", "daily_summary_enabled")
    op.drop_column("users", "quiet_end")
    op.drop_column("users", "quiet_start")
    op.drop_column("users", "quiet_hours_enabled")
