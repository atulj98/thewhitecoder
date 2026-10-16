# Learning Workspace: local review first

This frontend update is based on main commit `f38ad90`. It uses the existing
Google sign-in, progress, and private-notes APIs. The PostgreSQL schema, backend,
published DSA manifest, question keys, and Render configuration are unchanged.
The sheet still contains 24 steps, 102 subtopics, and 241 practice questions.

## What changed

- A collapsible topic roadmap, focused question list, and notes panel.
- Search across the whole sheet; All, Unsolved, Solved, and Has notes filters.
- Continue learning opens the first unfinished question in sheet order.
- Selected topics and questions have shareable URLs and support browser history.
- The subtopic checkbox checks only when every question is completed. Filters
  never change which questions the bulk action includes.
- Question notes open alongside the questions. Drafts survive switching questions
  and subtopics during this visit; click Save note to persist them. Refreshing,
  leaving the workspace, or signing out discards unsaved drafts. The browser
  warns before a refresh/close when drafts exist; internal links do not show a
  confirmation. Save first before following those links.
- Monochrome light and dark themes with neutral accents. Existing saved preferences are
  respected; a new visitor starts in light mode.
- On a narrow screen, Browse topics expands the roadmap and notes appear below
  the questions. The notes icon focuses the note editor after it loads.

## Apply the patch to your existing working project (recommended)

1. Download `The_White_Coder_Learning_Workspace.patch` into Downloads.
2. Open your **existing working repository** in VS Code. In a new terminal,
   start at the project root containing `frontend`, `backend`, and `content`.
   `git status` must work here. Do not run these commands inside a different
   extracted or parent folder.
3. Confirm your current work is committed before proceeding. If `git status`
   lists unrelated modifications, keep them and commit them separately first.
4. Apply the patch once:

   ```bash
   git status
   git switch main
   git pull --ff-only origin main
   git switch -c feature/learning-workspace
   git apply --check ~/Downloads/The_White_Coder_Learning_Workspace.patch
   git apply ~/Downloads/The_White_Coder_Learning_Workspace.patch
   ```

   The patch targets `f38ad90`. If the check fails, stop and share the error;
   do not force it or reapply older patches. If you already applied this exact
   patch, `git apply --reverse --check` can verify that without changing files.

5. Keep your existing `backend/.env`, `backend/.venv`, and
   `frontend/.env.local`. This patch does not include or overwrite them.

## Option: use the complete updated ZIP

The ZIP contains one `thewhitecoder-learning-workspace` folder with source and
portable Git history, already on `feature/learning-workspace`. Its changes are
uncommitted for local review. **Do not apply the patch inside this folder:** it
already contains the update. Dependencies, private environment files, and build
outputs are intentionally excluded.

If using this option, extract into Downloads, open the extracted folder in
VS Code, and run `git status` there. Copy your existing working `backend/.env`
and `frontend/.env.local` into their corresponding folders. Create a new backend
virtual environment if you want full account testing from this copy; do not copy
or move a virtual environment from another path:

```bash
cd ~/Downloads/thewhitecoder-learning-workspace/backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
```

Use your existing local PostgreSQL database. This update does not require a new
database, data import, reset, or new Alembic migration.

## Step 1: start the existing local backend

From the repository root, in Terminal 1:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

If your Homebrew PostgreSQL server is stopped, start it with
`brew services start postgresql@17` before starting the API.
Check **http://127.0.0.1:8000/api/v1/health/ready**. A 404 at `/` is expected;
the backend root is not the frontend page.

## Step 2: check the frontend environment

In `frontend/.env.local`, retain your real Google Web Client ID:

```dotenv
VITE_STATIC_SITE=1
VITE_GOOGLE_CLIENT_ID=YOUR_EXISTING_WEB_CLIENT_ID.apps.googleusercontent.com
VITE_API_BASE_URL=
```

Leave the API base blank locally so Vite forwards `/api` to your local backend.
Use the same client ID as `GOOGLE_CLIENT_ID` in `backend/.env`.
For local testing, backend `COOKIE_SECURE` must be `false`, and
`FRONTEND_ORIGINS` must include `http://localhost:5173`. Use `localhost` when
opening the frontend so its origin matches your existing Google configuration.
Preserve your current production environment values on Render and GitHub.

## Step 3: start the frontend

Use Node.js 24, as in the GitHub Actions workflows. In Terminal 2, starting from
the repository root:

```bash
cd frontend
node --version
npm ci
npm run dev -- --port 5173 --strictPort
```

Leave this terminal running. Open **http://localhost:5173/#/sheets/dsa**.
If port 5173 is occupied, stop the earlier Vite server with Ctrl+C in its terminal
and restart this command. Do not stop the new server before opening the page.

For a quick guest-only visual review, you can omit the backend and run:

```bash
VITE_STATIC_SITE=1 VITE_GOOGLE_CLIENT_ID= VITE_API_BASE_URL= npm run dev -- --port 5173 --strictPort
```

This command disables account controls for that run. Return to the normal
command above for real sign-in, progress, and notes testing.

## Step 4: local acceptance checklist

- Open the home page and click Open learning workspace. Explore sheets still
  scrolls to the available DSA sheet.
- Browse several steps; only the selected subtopic's questions are shown.
- Search for a question in another step, then clear the search.
- Switch between light and dark themes; refresh to check the saved choice.
- Sign in with Google. Confirm the existing completion count loads correctly.
- Complete one question: the overall count increases by one, while Mark subtopic
  done stays empty until every question in that subtopic is complete.
- Select Solved or Unsolved, then use Mark subtopic done. It must include all
  questions in the subtopic, including filtered-out questions. Toggle it back
  only if you intend to clear that local account's subtopic progress.
- Save a note, switch questions, return, and refresh. The saved note should stay.
  Type an unsaved draft, switch to another question, and return to verify the
  draft survives. Save it before leaving the workspace.
- Use Continue learning and confirm it opens the first unfinished question.
- Copy a selected-question URL, open it again, and try the browser Back button.
- Narrow the window to a phone width; open Browse topics, choose a subtopic,
  then open a note with its icon. Check for horizontal overflow and keyboard use.
- Sign out and confirm private notes and completion controls are unavailable.

These checks use your **local database**, so their changes do not affect the
live site. A complete Google OAuth round trip must be checked on your Mac; the
automated tests use simulated API responses and do not sign into Google.

## Step 5: run checks before committing

From `frontend`:

```bash
npm test
npm run lint
npm run format:check
npm audit --audit-level=high
VITE_STATIC_SITE=1 npm run build
```

The 14 automated tests cover guest access, global search, completion aggregation
under filters, Continue learning, valid/invalid bookmarks, note persistence and
retry, delayed note responses, new edits during an older save, account changes,
and incompatible content versions. Both CI and the Pages workflow run them.

## After local review: publish the feature branch for review

Stop Vite with Ctrl+C. From `frontend`, return to the repository root and run:

```bash
cd ..
git status
git diff --check
git add -A
git commit -m "Add Learning Workspace with focused practice and private notes"
git push -u origin feature/learning-workspace
```

Review staged changes before committing if you have made additional edits.
Pushing this feature branch runs CI. The Pages deployment is configured for
`main`; the feature-branch push does not deploy the public frontend.

After you approve the local UI, open a pull request into `main`, wait for CI,
and merge it. That merge triggers the existing production deployment. Keep
`VITE_GOOGLE_CLIENT_ID` and `VITE_API_BASE_URL` GitHub repository variables as
currently configured. No DNS, Render environment, or database changes are needed.
On the live site, verify Google sign-in, one question toggle, and a saved note
before announcing the update. If a regression appears, revert the workspace
merge/commit and let the Pages workflow redeploy the previous frontend.
