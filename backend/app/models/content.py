from sqlalchemy import ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Sheet(Base):
    __tablename__ = "sheets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    published_revision_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("sheet_revisions.id", name="fk_sheets_published_revision"),
        nullable=True,
    )


class SheetRevision(Base):
    __tablename__ = "sheet_revisions"
    __table_args__ = (UniqueConstraint("sheet_id", "revision_number"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    sheet_id: Mapped[str] = mapped_column(String(36), ForeignKey("sheets.id"), nullable=False)
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False)


class Step(Base):
    __tablename__ = "steps"
    __table_args__ = (
        UniqueConstraint("revision_id", "stable_key"),
        UniqueConstraint("revision_id", "sort_order"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    revision_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sheet_revisions.id"), nullable=False
    )
    stable_key: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)


class Topic(Base):
    __tablename__ = "topics"
    __table_args__ = (
        UniqueConstraint("step_id", "stable_key"),
        UniqueConstraint("step_id", "sort_order"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    step_id: Mapped[str] = mapped_column(String(36), ForeignKey("steps.id"), nullable=False)
    stable_key: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)


class Item(Base):
    __tablename__ = "items"
    __table_args__ = (
        UniqueConstraint("topic_id", "stable_key"),
        UniqueConstraint("topic_id", "sort_order"),
        Index("ix_items_topic_order", "topic_id", "sort_order"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey("topics.id"), nullable=False)
    stable_key: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    kind: Mapped[str] = mapped_column(String(24), nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
