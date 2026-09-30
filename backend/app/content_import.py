"""Operator-only, transactional import and publication for reviewed sheet manifests."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.content_manifest import SheetManifest
from app.models import Item, Sheet, SheetRevision, Step, Topic


def import_draft(db: Session, manifest: SheetManifest) -> int:
    """Append a revision without altering the public publication pointer."""
    with db.begin():
        sheet = db.scalar(select(Sheet).where(Sheet.slug == manifest.slug).with_for_update())
        if sheet is None:
            raise ValueError(f"Unknown sheet: {manifest.slug}. Run alembic upgrade head first.")

        latest = db.scalar(
            select(func.max(SheetRevision.revision_number)).where(
                SheetRevision.sheet_id == sheet.id
            )
        )
        revision_number = (latest or 0) + 1
        revision = SheetRevision(
            id=str(uuid.uuid4()),
            sheet_id=sheet.id,
            revision_number=revision_number,
            state="draft",
        )
        db.add(revision)

        for step_order, step_data in enumerate(manifest.steps, 1):
            step = Step(
                id=str(uuid.uuid4()),
                revision_id=revision.id,
                stable_key=step_data.stable_key,
                title=step_data.title,
                sort_order=step_order,
            )
            db.add(step)
            for topic_order, topic_data in enumerate(step_data.topics, 1):
                topic = Topic(
                    id=str(uuid.uuid4()),
                    step_id=step.id,
                    stable_key=topic_data.stable_key,
                    title=topic_data.title,
                    sort_order=topic_order,
                )
                db.add(topic)
                for item_order, item_data in enumerate(topic_data.items, 1):
                    db.add(
                        Item(
                            id=str(uuid.uuid4()),
                            topic_id=topic.id,
                            stable_key=item_data.stable_key,
                            title=item_data.title,
                            kind=item_data.kind,
                            source_url=str(item_data.source_url)
                            if item_data.source_url is not None
                            else None,
                            sort_order=item_order,
                        )
                    )
    return revision_number


def publish_revision(db: Session, slug: str, revision_number: int) -> None:
    """Make exactly one already-imported draft visible through the public API."""
    with db.begin():
        sheet = db.scalar(select(Sheet).where(Sheet.slug == slug).with_for_update())
        if sheet is None:
            raise ValueError(f"Unknown sheet: {slug}")
        revision = db.scalar(
            select(SheetRevision).where(
                SheetRevision.sheet_id == sheet.id,
                SheetRevision.revision_number == revision_number,
            )
        )
        if revision is None or revision.state != "draft":
            raise ValueError("Revision does not exist as a draft for this sheet")
        if not db.scalar(select(func.count(Step.id)).where(Step.revision_id == revision.id)):
            raise ValueError("Cannot publish a revision without steps")

        revision.state = "published"
        sheet.published_revision_id = revision.id
