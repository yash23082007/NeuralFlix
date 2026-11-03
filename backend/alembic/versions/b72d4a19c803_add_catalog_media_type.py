"""Add catalog media type so TV and films can be filtered separately.

Revision ID: b72d4a19c803
Revises: 9a2c1b7d4e10
Create Date: 2026-10-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b72d4a19c803"
down_revision: Union[str, Sequence[str], None] = "9a2c1b7d4e10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "movies",
        sa.Column("media_type", sa.String(length=20), nullable=False, server_default="movie"),
    )
    op.create_index("ix_movies_media_type", "movies", ["media_type"])


def downgrade() -> None:
    op.drop_index("ix_movies_media_type", table_name="movies")
    op.drop_column("movies", "media_type")
