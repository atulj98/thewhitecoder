import json
import uuid

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.sheets import get_sheet
from app.content_import import import_draft, publish_revision
from app.content_manifest import SheetManifest
from app.db.base import Base
from app.models import Sheet, SheetRevision


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


def test_import_is_private_until_published_and_keeps_older_revisions():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as db:
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
        assert get_sheet("dsa", db).steps == []
        db.rollback()  # End the read-only transaction before the next operator command.

        publish_revision(db, "dsa", revision)
        visible = get_sheet("dsa", db)
        assert visible.revision_number == 1
        assert visible.steps[0].topics[0].items[0].title == "Resource from source PDF"
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
    engine.dispose()


def test_staging_requires_explicit_replace(tmp_path, monkeypatch):
    from app import content_cli

    monkeypatch.setattr(content_cli, "PUBLISHED", tmp_path)
    manifest = SheetManifest.model_validate(manifest_data())
    path = content_cli.stage(manifest, replace=False)
    assert json.loads(path.read_text(encoding="utf-8"))["slug"] == "dsa"
    with pytest.raises(ValueError, match="--replace"):
        content_cli.stage(manifest, replace=False)
