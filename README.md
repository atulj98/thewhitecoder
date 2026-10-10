# The White Coder - Study Sheets

A public, step-by-step learning hub for **DSA, Computer Networks, Operating Systems, DBMS, and OOP** under The White Coder brand. The DSA sheet has 24 ordered steps, 101 subtopics, and 229 curated practice questions with direct LeetCode, GeeksforGeeks, or Codeforces links. Each topic has a study focus and two or more questions in a suggested order; Dynamic Programming adds six topics with three questions each. Each question's separate content link is currently shown as `-` until learning resources are added. The other four subjects remain in preparation.

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

To preview the published Pages content locally without MySQL, run `VITE_STATIC_SITE=1 npm run dev` from `frontend/` and open **http://localhost:5173/thewhitecoder/**.

## Prepare and publish sheet content

The DSA roadmap in `content/published/dsa.json` follows the supplied topic outline, with Dynamic Programming added after Graph as an essential bridge to advanced problem solving. The selection and ordering of problems were independently curated after reviewing a public DSA roadmap for progression; neither its layout nor its problem list was copied. Start with the study focus for each topic, then solve its questions in order. Practice questions have not yet been matched to a source PDF. For later sheets, transcribe one PDF at a time into `content/drafts/<slug>.json` (`dsa`, `cn`, `os`, `dbms`, or `oops`). Draft JSON files are ignored by Git; reviewed published copies are committed. Preserve each PDF's actual ordering, titles, and links. A minimal **shape example**, with placeholder titles to replace, is:

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
              "source_url": null,
              "content_url": null
            }
          ]
        }
      ]
    }
  ]
}
```

Keys use lowercase letters, digits, and hyphens and must be unique among siblings. Steps, topics, and items use their array order on the site. Both `source_url` (the practice problem) and `content_url` (the learning resource) may be `null` or an HTTP(S) link. `content_url: null` displays as `-` for a question; do not store the literal dash as a URL. Existing manifests can omit `content_url`. From `backend/` with its virtual environment active:

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

To show the linked DSA sheet through your **local MySQL API**, first run `alembic upgrade head` for the new content-link column. Then run `python -m app.content_cli import-draft ../content/published/dsa.json` from `backend/`, followed by `python -m app.content_cli publish-db dsa <printed-revision-number>`. Refresh the frontend after publication. To inspect the same sheet without MySQL, run `VITE_STATIC_SITE=1 npm run dev` in `frontend/` and open `http://localhost:5173/thewhitecoder/#/sheets/dsa`.

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

1. Review the expanded DSA questions with students, add original learning resources and explanations, then map the remaining four PDFs.
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
