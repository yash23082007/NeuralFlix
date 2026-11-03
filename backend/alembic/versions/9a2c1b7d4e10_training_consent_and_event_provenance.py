"""Track model-training consent and distinguish app watches from onboarding seeds.

Revision ID: 9a2c1b7d4e10
Revises: 6182d9452b0e
Create Date: 2026-10-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "9a2c1b7d4e10"
down_revision: Union[str, Sequence[str], None] = "6182d9452b0e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("recommendation_training_consent", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("users", sa.Column("recommendation_training_consent_at", sa.DateTime(), nullable=True))
    op.add_column(
        "watch_events",
        sa.Column("source", sa.String(length=30), nullable=False, server_default="legacy"),
    )
    # Preserve an honest event count: prior rows cannot be reliably classified as app events.
    # Keep database defaults portable to SQLite. The legacy source default deliberately
    # prevents pre-migration rows from being misreported as first-party app events.


def downgrade() -> None:
    op.drop_column("watch_events", "source")
    op.drop_column("users", "recommendation_training_consent_at")
    op.drop_column("users", "recommendation_training_consent")
