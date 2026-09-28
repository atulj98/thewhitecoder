"""Create versioned sheet catalog and seed five subjects.

Revision ID: 0001
Revises:
"""

import uuid

import sqlalchemy as sa

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sheets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("published_revision_id", sa.String(36), nullable=True),
    )
    op.create_table(
        "sheet_revisions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("sheet_id", sa.String(36), sa.ForeignKey("sheets.id"), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.UniqueConstraint("sheet_id", "revision_number"),
    )
    op.create_foreign_key(
        "fk_sheets_published_revision",
        "sheets",
        "sheet_revisions",
        ["published_revision_id"],
        ["id"],
    )
    op.create_table(
        "steps",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "revision_id", sa.String(36), sa.ForeignKey("sheet_revisions.id"), nullable=False
        ),
        sa.Column("stable_key", sa.String(80), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.UniqueConstraint("revision_id", "stable_key"),
        sa.UniqueConstraint("revision_id", "sort_order"),
    )
    op.create_table(
        "topics",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("step_id", sa.String(36), sa.ForeignKey("steps.id"), nullable=False),
        sa.Column("stable_key", sa.String(80), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.UniqueConstraint("step_id", "stable_key"),
        sa.UniqueConstraint("step_id", "sort_order"),
    )
    op.create_table(
        "items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("topic_id", sa.String(36), sa.ForeignKey("topics.id"), nullable=False),
        sa.Column("stable_key", sa.String(80), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column("source_url", sa.String(2048), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.UniqueConstraint("topic_id", "stable_key"),
        sa.UniqueConstraint("topic_id", "sort_order"),
    )
    op.create_index("ix_items_topic_order", "items", ["topic_id", "sort_order"])

    subjects = [
        (
            "dsa",
            "Data Structures & Algorithms",
            "A guided path from fundamentals to advanced problem solving.",
        ),
        (
            "cn",
            "Computer Networks",
            "Build a strong understanding of networking, from layers to protocols.",
        ),
        (
            "os",
            "Operating Systems",
            "Learn processes, memory, concurrency, and the foundations of modern systems.",
        ),
        (
            "dbms",
            "Database Management Systems",
            "Master data models, SQL concepts, transactions, and design.",
        ),
        (
            "oops",
            "Object Oriented Programming",
            "Practice the principles and patterns behind maintainable software.",
        ),
    ]
    sheets = sa.table(
        "sheets",
        sa.column("id", sa.String),
        sa.column("slug", sa.String),
        sa.column("title", sa.String),
        sa.column("description", sa.Text),
        sa.column("sort_order", sa.Integer),
    )
    op.bulk_insert(
        sheets,
        [
            dict(
                id=str(uuid.uuid4()),
                slug=slug,
                title=title,
                description=description,
                sort_order=index,
            )
            for index, (slug, title, description) in enumerate(subjects, 1)
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_items_topic_order", table_name="items")
    op.drop_table("items")
    op.drop_table("topics")
    op.drop_table("steps")
    op.drop_constraint("fk_sheets_published_revision", "sheets", type_="foreignkey")
    op.drop_table("sheet_revisions")
    op.drop_table("sheets")
