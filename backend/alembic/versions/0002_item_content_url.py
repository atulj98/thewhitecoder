"""Add a separate learning resource link for sheet items.

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("items", sa.Column("content_url", sa.String(2048), nullable=True))


def downgrade() -> None:
    op.drop_column("items", "content_url")
