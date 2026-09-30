"""Review and publish sheet content with explicit operator commands."""

import argparse
import json
import sys
from pathlib import Path

from pydantic import ValidationError

from app.content_manifest import SheetManifest, load_manifest

PUBLISHED = Path(__file__).resolve().parents[2] / "content" / "published"


def stage(manifest: SheetManifest, replace: bool) -> Path:
    """Write the reviewed file that the next GitHub Pages build will include."""
    PUBLISHED.mkdir(parents=True, exist_ok=True)
    destination = PUBLISHED / f"{manifest.slug}.json"
    if destination.exists() and not replace:
        raise ValueError(f"{destination} already exists; use --replace after reviewing the update")
    content = json.dumps(manifest.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n"
    temporary = destination.with_suffix(".json.tmp")
    try:
        temporary.write_text(content, encoding="utf-8")
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)
    return destination


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate and publish reviewed sheet content")
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("validate", "stage", "import-draft"):
        command = commands.add_parser(name)
        command.add_argument("manifest", type=Path)
        if name == "stage":
            command.add_argument("--replace", action="store_true")
    commands.add_parser("validate-all")
    publish = commands.add_parser("publish-db")
    publish.add_argument("slug", choices=("dsa", "cn", "os", "dbms", "oops"))
    publish.add_argument("revision", type=int)
    args = parser.parse_args(argv)

    try:
        if args.command == "validate-all":
            for path in sorted(PUBLISHED.glob("*.json")):
                manifest = load_manifest(path)
                if path.stem != manifest.slug:
                    raise ValueError(f"{path}: filename must match slug {manifest.slug}")
                print(f"Validated {path}")
            return 0
        if args.command == "publish-db":
            from app.content_import import publish_revision
            from app.db.session import SessionLocal

            with SessionLocal() as db:
                publish_revision(db, args.slug, args.revision)
            print(f"Published {args.slug} revision {args.revision} to the API")
            return 0

        manifest = load_manifest(args.manifest)
        print(f"Validated {manifest.slug}: {len(manifest.steps)} steps")
        if args.command == "stage":
            print(f"Staged for GitHub Pages: {stage(manifest, args.replace)}")
        elif args.command == "import-draft":
            from app.content_import import import_draft
            from app.db.session import SessionLocal

            with SessionLocal() as db:
                revision = import_draft(db, manifest)
            print(f"Imported {manifest.slug} revision {revision} as a private draft")
        return 0
    except (OSError, json.JSONDecodeError, ValidationError, ValueError) as exc:
        print(f"Content error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
