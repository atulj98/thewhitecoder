# Study Sheets

A public, step-by-step learning hub for **DSA, Computer Networks, Operating Systems, DBMS, and OOP**. This repository is the first working slice: a React catalog backed by a FastAPI/MySQL API. Sheet content is deliberately not invented; each sheet shows a preparation state until its source PDF has been reviewed and published.

## Stack

- Frontend: React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS
- Backend: FastAPI, Pydantic, SQLAlchemy, Alembic, PyMySQL
- Database: MySQL 8.4 with InnoDB

## Prerequisites

- Node.js 20.19+ or 22.12+ (Node 24 is also suitable for this Vite release)
- Python 3.11+
- Docker Desktop with Compose, **or** a local MySQL 8.4 server configured with the database and user in `docker-compose.yml`

## Run locally

From the repository root:

```bash
docker compose up -d db
cp .env.example backend/.env
cd backend
python3 -m venv .venv
source .venv/bin/activate
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

If port 3306 is already in use, stop the other MySQL service or change both the Compose host port and `DATABASE_URL`. The passwords in Compose and `.env.example` are strictly for local development; provision separate credentials for production.

## Checks

```bash
cd frontend && npm run build && npm run lint && npm run format:check
cd ../backend && ruff check . && ruff format --check . && pytest -q
```

The database-backed test requires `docker compose up -d db` and `alembic upgrade head` first. CI creates a fresh MySQL service for this.

## Content model

`sheet → published revision → ordered steps → ordered topics → ordered items`. The initial migration creates the five sheet records; no lessons are public until a revision is explicitly published. The API returns only published revision content. Administrative import/publishing, authentication, and learner progress are upcoming milestones.

## Next milestones

1. Map the five source PDFs into reviewed steps, topics, items, and links.
2. Build an admin draft and publication workflow with revision history.
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
