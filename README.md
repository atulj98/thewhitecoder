# The White Coder - Study Sheets

A public, step-by-step learning hub for **DSA, Computer Networks, Operating Systems, DBMS, and OOP** under The White Coder brand. This repository is the first working slice: a React catalog backed by a FastAPI/MySQL API. Sheet content is deliberately not invented; each sheet shows a preparation state until its source PDF has been reviewed and published.

## Stack

- Frontend: React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS
- Backend: FastAPI, Pydantic, SQLAlchemy, Alembic, PyMySQL
- Database: MySQL 8.4 with InnoDB

## Prerequisites

- Node.js 20.19+ or 22.12+ (Node 24 is also suitable for this Vite release)
- Python 3.11+
- Docker Desktop with Compose, **or** a local MySQL 8.4 server configured with the database and user in `docker-compose.yml`

Check `python3 --version` before creating the backend virtual environment. On a Mac where `python3` is older than 3.11, install a newer Python first (for example, `brew install python@3.12`) and create the environment with `python3.12 -m venv .venv` instead. A virtual environment keeps the version of Python that created it.

## Run locally

From the repository root:

```bash
docker compose up -d db
cp .env.example backend/.env
cd backend
python3 -m venv .venv
source .venv/bin/activate
python --version  # Must be 3.11 or newer
python -m pip install --upgrade pip setuptools wheel
python -m pip install -e '.[dev]'
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Open another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. Vite forwards `/api` calls to FastAPI at `127.0.0.1:8000`. The API docs are at **http://127.0.0.1:8000/docs**. The health endpoints are `/api/v1/health/live` and `/api/v1/health/ready`.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds `frontend/` and deploys `frontend/dist` when `main` is pushed. In the repository's **Settings → Pages**, select **GitHub Actions** as the source. For `https://atulj98.github.io/thewhitecoder/`, the Pages build uses `/thewhitecoder/` as its asset path and hash-based links for subject pages.

The five subject cards appear before content is ready. Reviewed files in `content/published/` are bundled into the Pages build as step-by-step sheets. Drafts in `content/drafts/` are never bundled. GitHub Pages cannot run FastAPI or MySQL; the local development build still reads the API. Authentication and server-backed progress will require separately hosted backend and database services.

## Prepare and publish sheet content

The source PDFs are needed to create the real sheets. Transcribe one PDF at a time into `content/drafts/<slug>.json` (`dsa`, `cn`, `os`, `dbms`, or `oops`). Draft JSON files are ignored by Git; reviewed published copies are committed. Preserve the PDF's actual ordering, titles, and links; do not invent missing lessons. A minimal **shape example**, with placeholder titles to replace, is:

```json
{
  "manifest_version": 1,
  "slug": "dsa",
  "steps": [
    {
      "stable_key": "step-1",
      "title": "Replace with the PDF step title",
      "topics": [
        {
          "stable_key": "topic-1",
          "title": "Replace with the PDF topic title",
          "items": [
            {
              "stable_key": "item-1",
              "title": "Replace with the PDF resource title",
              "kind": "resource",
              "source_url": null
            }
          ]
        }
      ]
    }
  ]
}
```

Keys use lowercase letters, digits, and hyphens and must be unique among siblings. Steps, topics, and items use their array order on the site. `source_url` may be `null` or an HTTP(S) link. From `backend/` with its virtual environment active:

```bash
python -m app.content_cli validate ../content/drafts/dsa.json
python -m app.content_cli stage ../content/drafts/dsa.json
```

Inspect the staged `content/published/dsa.json` before committing and pushing it. The Pages deployment validates every published file; a bad manifest fails the build. To replace an existing published sheet after review, use `stage ... --replace`. Publication on Pages follows the Git commit and deployment.

For the local MySQL API, import the same reviewed draft as a private version, then explicitly publish its printed revision number:

```bash
python -m app.content_cli import-draft ../content/drafts/dsa.json
python -m app.content_cli publish-db dsa 1
```

The database import does not expose a draft through the public API. Publishing a new revision switches the public pointer atomically and retains older revisions. The Pages and API publication commands are separate because they run on different hosts.

If port 3306 is already in use, stop the other MySQL service or change both the Compose host port and `DATABASE_URL`. The passwords in Compose and `.env.example` are strictly for local development; provision separate credentials for production.

If an editable install says `setup.py` or `setup.cfg` is missing despite finding `pyproject.toml`, check the Python and pip versions inside `(.venv)`. Older pip releases do not support the editable build interface used here. Upgrade pip in the virtual environment using the command above; if Python is below 3.11, recreate `.venv` with Python 3.11+ first. `alembic` becomes available only after the project installation succeeds.

## Checks

```bash
cd frontend && npm run build && npm run lint && npm run format:check
cd ../backend && ruff check . && ruff format --check . && pytest -q
```

The database-backed test requires `docker compose up -d db` and `alembic upgrade head` first. CI creates a fresh MySQL service for this.

## Content model

`sheet → published revision → ordered steps → ordered topics → ordered items`. The initial migration creates the five sheet records. Reviewed manifests can be staged for Pages or imported as private database revisions. The API returns only explicitly published revision content.

## Next milestones

1. Map the five source PDFs into reviewed steps, topics, items, and links.
2. Add a browser-based admin editor and review workflow after the first PDF has established the content shape.
3. Implement manual sign-up plus Google and Facebook login, using revocable server sessions.
4. Add per-user progress and bookmarks, then complete accessibility and deployment checks.

See the companion HLD/LLD PDF for the architecture and detailed rules.

## Publish to your GitHub repository

After extracting this project and creating an empty repository on GitHub, run these commands from its root:

```bash
git init -b main
git add .
git commit -m "chore: initialize study sheets app"
git remote add origin <your-repository-ssh-url>
git push -u origin main
```

Replace the placeholder with your actual repository URL. The `.gitignore` excludes local credentials, the Python environment, installed JavaScript packages, and build output.
