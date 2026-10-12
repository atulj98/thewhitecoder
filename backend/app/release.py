"""Migrate and initialize the hosted API before it starts accepting requests."""

import sys
from pathlib import Path

from alembic.config import Config
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from alembic import command
from app.content_import import import_draft, publish_revision
from app.content_manifest import SheetManifest, load_manifest
from app.core.config import Settings, get_settings
from app.models import Sheet

BACKEND = Path(__file__).resolve().parents[1]
MANIFEST = BACKEND.parent / "content" / "published" / "dsa.json"


def validate_production_settings(settings: Settings) -> None:
    if not settings.database_url.startswith("postgresql+psycopg://"):
        raise ValueError("Set DATABASE_URL to the hosted PostgreSQL database URL.")
    if not settings.google_client_id.endswith(".apps.googleusercontent.com"):
        raise ValueError("Set GOOGLE_CLIENT_ID to your Google web client ID.")
    if not settings.cookie_secure:
        raise ValueError("Production requires COOKIE_SECURE=true.")
    allowed = {"https://thewhitecoder.com", "https://www.thewhitecoder.com"}
    if (
        "https://thewhitecoder.com" not in settings.frontend_origins
        or not set(settings.frontend_origins) <= allowed
    ):
        raise ValueError("Set FRONTEND_ORIGINS to the HTTPS thewhitecoder.com origins.")


def ensure_initial_publication(db: Session, manifest: SheetManifest) -> tuple[int, bool]:
    """Initialize a fresh database; leave an existing publication and student data intact.

    Use a fresh session with no pending transaction. A changed reviewed sheet
    requires the existing explicit import-draft/publish-db operator workflow.
    """
    from app.api.sheets import get_sheet

    with db.begin():
        sheet = db.scalar(select(Sheet).where(Sheet.slug == manifest.slug))
        if sheet is None:
            raise ValueError("Run alembic upgrade head before initializing the sheet.")
        current = get_sheet(manifest.slug, db) if sheet.published_revision_id else None

    if current is not None:
        if current.model_dump(mode="json")["steps"] != manifest.model_dump(mode="json")["steps"]:
            raise ValueError(
                "The published API sheet differs from the deployed manifest. "
                "Import the reviewed manifest with import-draft, publish its printed "
                "revision with publish-db, and retry deployment."
            )
        return current.revision_number, False

    revision = import_draft(db, manifest)
    publish_revision(db, manifest.slug, revision)
    return revision, True


def main() -> int:
    try:
        validate_production_settings(get_settings())
        manifest = load_manifest(MANIFEST)
        config = Config(str(BACKEND / "alembic.ini"))
        config.set_main_option("script_location", str(BACKEND / "alembic"))
        command.upgrade(config, "head")

        from app.db.session import SessionLocal

        with SessionLocal() as db:
            revision, created = ensure_initial_publication(db, manifest)
        action = "Initialized" if created else "Verified existing"
        print(f"{action} {manifest.slug} publication: revision {revision}")
        return 0
    except SQLAlchemyError:
        # Connection errors may include credentials; never print bind parameters
        # or the provider's DATABASE_URL in public deployment logs.
        print("Database setup failed. Verify the hosted database connection.", file=sys.stderr)
        return 1
    except (OSError, ValueError) as error:
        print(f"Release setup failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
