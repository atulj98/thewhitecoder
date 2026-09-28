from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Item, Sheet, SheetRevision, Step, Topic
from app.schemas.content import ItemRead, SheetRead, SheetSummary, StepRead, TopicRead

router = APIRouter(prefix="/sheets", tags=["sheets"])


def to_summary(sheet: Sheet) -> SheetSummary:
    return SheetSummary(
        slug=sheet.slug,
        title=sheet.title,
        description=sheet.description,
        sort_order=sheet.sort_order,
        is_published=bool(sheet.published_revision_id),
    )


@router.get("", response_model=list[SheetSummary])
def list_sheets(db: Session = Depends(get_db)) -> list[SheetSummary]:
    sheets = db.scalars(select(Sheet).order_by(Sheet.sort_order)).all()
    return [to_summary(sheet) for sheet in sheets]


@router.get("/{slug}", response_model=SheetRead)
def get_sheet(slug: str, db: Session = Depends(get_db)) -> SheetRead:
    sheet = db.scalar(select(Sheet).where(Sheet.slug == slug))
    if sheet is None:
        raise HTTPException(status_code=404, detail="Sheet not found")

    summary = to_summary(sheet)
    if sheet.published_revision_id is None:
        return SheetRead(**summary.model_dump(), revision_number=None, steps=[])

    revision = db.scalar(
        select(SheetRevision).where(
            SheetRevision.id == sheet.published_revision_id,
            SheetRevision.sheet_id == sheet.id,
            SheetRevision.state == "published",
        )
    )
    if revision is None:
        # Do not accidentally reveal a draft if the publication pointer is corrupt.
        raise HTTPException(status_code=503, detail="Published sheet temporarily unavailable")

    steps = db.scalars(
        select(Step).where(Step.revision_id == revision.id).order_by(Step.sort_order)
    ).all()
    if not steps:
        return SheetRead(**summary.model_dump(), revision_number=revision.revision_number, steps=[])
    topics = db.scalars(
        select(Topic).where(Topic.step_id.in_([s.id for s in steps])).order_by(Topic.sort_order)
    ).all()
    items = (
        db.scalars(
            select(Item).where(Item.topic_id.in_([t.id for t in topics])).order_by(Item.sort_order)
        ).all()
        if topics
        else []
    )
    items_by_topic: dict[str, list[ItemRead]] = {t.id: [] for t in topics}
    for item in items:
        items_by_topic[item.topic_id].append(
            ItemRead(
                stable_key=item.stable_key,
                title=item.title,
                kind=item.kind,
                source_url=item.source_url,
            )
        )
    topics_by_step: dict[str, list[TopicRead]] = {s.id: [] for s in steps}
    for topic in topics:
        topics_by_step[topic.step_id].append(
            TopicRead(
                stable_key=topic.stable_key, title=topic.title, items=items_by_topic[topic.id]
            )
        )
    return SheetRead(
        **summary.model_dump(),
        revision_number=revision.revision_number,
        steps=[
            StepRead(stable_key=s.stable_key, title=s.title, topics=topics_by_step[s.id])
            for s in steps
        ],
    )
