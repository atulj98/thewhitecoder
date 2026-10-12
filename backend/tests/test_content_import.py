import json
import uuid
from pathlib import Path

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine, event, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.sheets import get_sheet, list_sheets
from app.content_import import import_draft, publish_revision
from app.content_manifest import SheetManifest, load_manifest
from app.db.base import Base
from app.models import Item, Sheet, SheetRevision, Step, Topic
from app.release import ensure_initial_publication


@pytest.fixture
def strict_engine():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enforce_foreign_keys(connection, record):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


def manifest_data() -> dict:
    return {
        "manifest_version": 1,
        "slug": "dsa",
        "steps": [
            {
                "stable_key": "foundations",
                "title": "Title from source PDF",
                "topics": [
                    {
                        "stable_key": "basics",
                        "title": "Topic from source PDF",
                        "items": [
                            {
                                "stable_key": "resource-1",
                                "title": "Resource from source PDF",
                                "kind": "resource",
                                "source_url": "https://example.org/resource",
                                "content_url": "https://example.org/guide",
                            }
                        ],
                    }
                ],
            }
        ],
    }


def test_manifest_rejects_duplicate_keys_and_unsafe_links():
    data = manifest_data()
    data["steps"].append(data["steps"][0])
    with pytest.raises(ValidationError, match="unique"):
        SheetManifest.model_validate(data)

    data = manifest_data()
    data["steps"][0]["topics"][0]["items"][0]["source_url"] = "javascript:alert(1)"
    with pytest.raises(ValidationError):
        SheetManifest.model_validate(data)

    data = manifest_data()
    data["steps"][0]["topics"][0]["items"][0]["content_url"] = "javascript:alert(1)"
    with pytest.raises(ValidationError):
        SheetManifest.model_validate(data)


def test_import_is_private_until_published_and_keeps_older_revisions(strict_engine):
    with Session(strict_engine, autoflush=False) as db:
        db.add(
            Sheet(
                id=str(uuid.uuid4()),
                slug="dsa",
                title="Data Structures & Algorithms",
                description="Learn DSA",
                sort_order=1,
            )
        )
        db.commit()

        revision = import_draft(db, SheetManifest.model_validate(manifest_data()))
        assert revision == 1
        assert list_sheets(db) == []
        with pytest.raises(HTTPException) as exc_info:
            get_sheet("dsa", db)
        assert exc_info.value.status_code == 404
        db.rollback()  # End the read-only transaction before the next operator command.

        publish_revision(db, "dsa", revision)
        assert [sheet.slug for sheet in list_sheets(db)] == ["dsa"]
        visible = get_sheet("dsa", db)
        assert visible.revision_number == 1
        assert visible.steps[0].topics[0].items[0].title == "Resource from source PDF"
        assert visible.steps[0].topics[0].items[0].content_url == "https://example.org/guide"
        db.rollback()

        next_data = manifest_data()
        next_data["steps"][0]["topics"][0]["items"][0]["title"] = "Updated resource"
        assert import_draft(db, SheetManifest.model_validate(next_data)) == 2
        assert get_sheet("dsa", db).revision_number == 1
        assert get_sheet("dsa", db).steps[0].topics[0].items[0].title == "Resource from source PDF"
        db.rollback()

        with pytest.raises(ValueError, match="draft"):
            publish_revision(db, "dsa", 1)
        publish_revision(db, "dsa", 2)
        assert get_sheet("dsa", db).steps[0].topics[0].items[0].title == "Updated resource"
        assert len(db.scalars(select(SheetRevision)).all()) == 2


def test_full_dsa_import_respects_foreign_keys_and_publishes_all_questions(strict_engine):
    path = Path(__file__).resolve().parents[2] / "content/published/dsa.json"
    with Session(strict_engine, autoflush=False) as db:
        db.add(
            Sheet(id=str(uuid.uuid4()), slug="dsa", title="DSA", description="DSA", sort_order=1)
        )
        db.commit()
        revision = import_draft(db, load_manifest(path))
        assert revision == 1
        assert db.scalar(select(func.count(Step.id))) == 24
        assert db.scalar(select(func.count(Topic.id))) == 102
        assert db.scalar(select(func.count(Item.id)).where(Item.kind == "practice")) == 241
        assert list_sheets(db) == []
        db.rollback()
        publish_revision(db, "dsa", revision)
        sheet = get_sheet("dsa", db)
        assert (
            sum(
                item.kind == "practice"
                for step in sheet.steps
                for topic in step.topics
                for item in topic.items
            )
            == 241
        )


def test_late_import_failure_rolls_back_all_parent_rows_and_can_retry(strict_engine):
    with Session(strict_engine, autoflush=False) as db:
        db.add(
            Sheet(id=str(uuid.uuid4()), slug="dsa", title="DSA", description="DSA", sort_order=1)
        )
        db.commit()
        db.execute(
            text(
                "CREATE TRIGGER reject_items BEFORE INSERT ON items "
                "BEGIN SELECT RAISE(ABORT, 'simulated item failure'); END"
            )
        )
        db.commit()
        with pytest.raises(IntegrityError, match="simulated item failure"):
            import_draft(db, SheetManifest.model_validate(manifest_data()))
        for model in (SheetRevision, Step, Topic, Item):
            assert db.scalar(select(func.count(model.id))) == 0
        assert db.scalar(select(func.count(Sheet.id))) == 1
        db.execute(text("DROP TRIGGER reject_items"))
        db.commit()
        assert import_draft(db, SheetManifest.model_validate(manifest_data())) == 1


def test_staging_requires_explicit_replace(tmp_path, monkeypatch):
    from app import content_cli

    monkeypatch.setattr(content_cli, "PUBLISHED", tmp_path)
    manifest = SheetManifest.model_validate(manifest_data())
    path = content_cli.stage(manifest, replace=False)
    assert json.loads(path.read_text(encoding="utf-8"))["slug"] == "dsa"
    with pytest.raises(ValueError, match="--replace"):
        content_cli.stage(manifest, replace=False)


def test_release_initializes_once_and_preserves_the_published_revision(strict_engine):
    manifest = SheetManifest.model_validate(manifest_data())
    with Session(strict_engine, autoflush=False) as db:
        db.add(
            Sheet(id=str(uuid.uuid4()), slug="dsa", title="DSA", description="DSA", sort_order=1)
        )
        db.commit()
        assert ensure_initial_publication(db, manifest) == (1, True)
        assert ensure_initial_publication(db, manifest) == (1, False)
        assert db.scalar(select(func.count(SheetRevision.id))) == 1
        assert get_sheet("dsa", db).steps[0].title == manifest.steps[0].title


def test_release_rejects_changed_content_without_replacing_the_live_sheet(strict_engine):
    with Session(strict_engine, autoflush=False) as db:
        db.add(
            Sheet(id=str(uuid.uuid4()), slug="dsa", title="DSA", description="DSA", sort_order=1)
        )
        db.commit()
        ensure_initial_publication(db, SheetManifest.model_validate(manifest_data()))
        updated = manifest_data()
        updated["steps"][0]["topics"][0]["items"][0]["title"] = "Reviewed update"
        with pytest.raises(ValueError, match="differs"):
            ensure_initial_publication(db, SheetManifest.model_validate(updated))
        assert db.scalar(select(func.count(SheetRevision.id))) == 1
        assert get_sheet("dsa", db).steps[0].topics[0].items[0].title == "Resource from source PDF"


def test_release_requires_migrations_before_importing(strict_engine):
    with Session(strict_engine, autoflush=False) as db:
        with pytest.raises(ValueError, match="alembic"):
            ensure_initial_publication(db, SheetManifest.model_validate(manifest_data()))
        assert db.scalar(select(func.count(SheetRevision.id))) == 0
