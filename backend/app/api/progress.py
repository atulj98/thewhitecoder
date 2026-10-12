from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, StrictBool, model_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.sheets import get_sheet
from app.core.auth import current_session, protected_session
from app.db.session import get_db
from app.db.upsert import insert_for
from app.models import LoginSession, QuestionState

router = APIRouter(prefix="/me/progress", tags=["progress"])


class QuestionUpdate(BaseModel):
    completed: StrictBool | None = None
    notes: str | None = Field(default=None, max_length=10000)

    @model_validator(mode="after")
    def non_empty(self):
        if self.completed is None and self.notes is None:
            raise ValueError("Provide completed or notes")
        return self


class TopicUpdate(BaseModel):
    completed: StrictBool


def questions(db: Session, slug: str) -> set[tuple[str, str, str]]:
    sheet = get_sheet(slug, db)
    return {
        (step.stable_key, topic.stable_key, item.stable_key)
        for step in sheet.steps
        for topic in step.topics
        for item in topic.items
        if item.kind == "practice"
    }


def snapshot(db: Session, user_id: str, slug: str, keys: set) -> dict:
    entries = [
        {
            "step_key": row.step_key,
            "topic_key": row.topic_key,
            "item_key": row.item_key,
            "completed": row.completed,
            "has_notes": row.has_notes,
        }
        for row in db.execute(
            select(
                QuestionState.step_key,
                QuestionState.topic_key,
                QuestionState.item_key,
                QuestionState.completed,
                (func.length(QuestionState.notes) > 0).label("has_notes"),
            ).where(QuestionState.user_id == user_id, QuestionState.sheet_slug == slug)
        ).all()
        if (row.step_key, row.topic_key, row.item_key) in keys
    ]
    return {
        "sheet_slug": slug,
        "question_keys": sorted(keys),
        "total": len(keys),
        "completed": sum(entry["completed"] for entry in entries),
        "entries": entries,
    }


def write_state(db: Session, user_id: str, slug: str, key: tuple, changes: dict) -> None:
    stmt = insert_for(db, QuestionState).values(
        user_id=user_id,
        sheet_slug=slug,
        step_key=key[0],
        topic_key=key[1],
        item_key=key[2],
        **changes,
    )
    db.execute(
        stmt.on_conflict_do_update(
            index_elements=["user_id", "sheet_slug", "step_key", "topic_key", "item_key"],
            set_={**changes, "updated_at": func.now()},
        )
    )


@router.get("/{slug}")
def read_progress(
    slug: str,
    response: Response,
    session: LoginSession = Depends(current_session),
    db: Session = Depends(get_db),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    return snapshot(db, session.user_id, slug, questions(db, slug))


@router.patch("/{slug}/questions/{step}/{topic}/{item}")
def update_question(
    slug: str,
    step: str,
    topic: str,
    item: str,
    payload: QuestionUpdate,
    response: Response,
    session: LoginSession = Depends(protected_session),
    db: Session = Depends(get_db),
) -> dict:
    keys = questions(db, slug)
    key = (step, topic, item)
    if key not in keys:
        raise HTTPException(404, "Published practice question not found")
    write_state(db, session.user_id, slug, key, payload.model_dump(exclude_none=True))
    db.commit()
    db.expire_all()
    response.headers["Cache-Control"] = "no-store"
    return snapshot(db, session.user_id, slug, keys)


@router.get("/{slug}/questions/{step}/{topic}/{item}/notes")
def read_notes(
    slug: str,
    step: str,
    topic: str,
    item: str,
    response: Response,
    session: LoginSession = Depends(current_session),
    db: Session = Depends(get_db),
) -> dict:
    if (step, topic, item) not in questions(db, slug):
        raise HTTPException(404, "Published practice question not found")
    row = db.get(QuestionState, (session.user_id, slug, step, topic, item))
    response.headers["Cache-Control"] = "no-store"
    return {"notes": row.notes if row else ""}


@router.put("/{slug}/topics/{step}/{topic}")
def update_topic(
    slug: str,
    step: str,
    topic: str,
    payload: TopicUpdate,
    response: Response,
    session: LoginSession = Depends(protected_session),
    db: Session = Depends(get_db),
) -> dict:
    keys = questions(db, slug)
    selected = sorted(key for key in keys if key[:2] == (step, topic))
    if not selected:
        raise HTTPException(404, "Published practice topic not found")
    for key in selected:
        write_state(db, session.user_id, slug, key, {"completed": payload.completed})
    db.commit()
    db.expire_all()
    response.headers["Cache-Control"] = "no-store"
    return snapshot(db, session.user_id, slug, keys)
