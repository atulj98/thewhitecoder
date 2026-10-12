# Google login and private DSA progress

This update builds on main commit `011acd5` (the Ruff formatting fix).
It adds verified Google sign-in, PostgreSQL storage, per-question checkboxes,
topic completion, and private notes. The public sheet remains available to guests.

## What students see

- Sign in with Google creates an account on the first successful sign-in.
- A completed question increments the count, for example **1/241**. Unchecking it decrements it.
- Topic completion checks all practice questions in that topic in one transaction.
  A partially completed topic shows a mixed checkbox state.
- Notes belong to one student's account and one question. They are plain text,
  limited to 10,000 characters, and saved with **Save notes**.
- Completing or clearing a topic preserves existing notes.
- Signing back in restores saved progress and notes across devices.
- Progress is tied to stable step/topic/question keys, not titles or list positions.
  Preserve these keys during content updates. Moving a question to a different topic
  changes its identity and requires an explicit progress migration.
- Counts include only the currently published practice questions. Removed questions
  are excluded from the count; their stored state is retained.

## Architecture

The frontend stays on GitHub Pages at **https://thewhitecoder.com**.
FastAPI must run on a separate HTTPS service, preferably **https://api.thewhitecoder.com**,
with a managed PostgreSQL database accessible only to that API.
GitHub Pages cannot run the API or a database.

One API service and PostgreSQL are a reasonable starting architecture for 1,000
registered students. This is not a guarantee of 1,000 simultaneous requests:
measure actual usage before increasing worker counts. Each API worker currently
allows up to 10 database connections. Completion rows have a composite primary
key beginning with the user and sheet, and notes are fetched individually rather
than included in every progress response.

## Step 1: Create the Google web client

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select a project for The White Coder.
3. Under **Google Auth Platform**, configure Branding with the app name and your
   support email, and choose an **External** audience for public student access.
   Follow the Console's applicable branding and publishing requirements before launch.
4. Under **Clients**, create an OAuth client of type **Web application**.
5. Add these **Authorized JavaScript origins**:

   ```text
   http://localhost
   http://localhost:5173
   http://localhost:5174
   https://thewhitecoder.com
   https://www.thewhitecoder.com
   ```

6. Copy the **Client ID**. Use the same value in both environment files below.
   This GIS button uses a JavaScript callback; it does not need a redirect URI or
   a client secret. It asks for identity only, not Gmail, Drive, or other Google API access.
7. Review the Audience/publishing settings before opening access to all students.
   Google documents an exception to its usual Testing restrictions for basic
   identity scopes; do not request additional scopes for this feature.

References:
[GIS setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid),
[Google app audience](https://support.google.com/cloud/answer/15549945),
[server token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## Step 2: Apply the code once, from the repository root

After downloading `The_White_Coder_Google_Progress.patch`:

```bash
cd /Users/ujjwalkumarjha/Desktop/thewhitecoder/thewhitecoder
git status
git pull --ff-only origin main
git switch -c feature/google-progress
git apply --check ~/Downloads/The_White_Coder_Google_Progress.patch
git apply ~/Downloads/The_White_Coder_Google_Progress.patch
```

Start with a clean working tree. If the patch was already applied, applying it
again will fail; `git apply --reverse --check <patch-path>` checks that situation
without changing files. This is a feature branch, so its push does not deploy Pages.

## Step 3: Start PostgreSQL locally

Choose one local database approach. With Docker Desktop installed and running,
from the project root:

```bash
docker compose up -d db
docker compose ps
```

On your Mac, you can instead use Homebrew without Docker:

```bash
brew install postgresql@17
brew services start postgresql@17
"$(brew --prefix postgresql@17)/bin/psql" -d postgres -c "CREATE ROLE study_sheets WITH LOGIN PASSWORD 'study_sheets_dev';"
"$(brew --prefix postgresql@17)/bin/psql" -d postgres -c "CREATE DATABASE study_sheets OWNER study_sheets;"
```

Run the CREATE commands only for a new role/database. If they already exist,
use their existing credentials. The example password is for local development.
The Homebrew installation/service commands are documented on the
[official formula page](https://formulae.brew.sh/formula/postgresql@17).
Alternatively, use a development managed PostgreSQL instance and its connection URL.
Compose creates a new PostgreSQL volume. Existing MySQL data is not automatically
migrated; the reviewed DSA content is imported from JSON below.

## Step 4: Configure and run the backend

Use an installed Python 3.11+ interpreter; the example uses Python 3.12. If you
already have a suitable backend virtual environment, activate it and install
the updated dependencies rather than recreating it.

From the project root:

```bash
cp -n .env.example backend/.env
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
```

Edit `backend/.env`:

```dotenv
DATABASE_URL=postgresql+psycopg://study_sheets:study_sheets_dev@127.0.0.1:5432/study_sheets
GOOGLE_CLIENT_ID=YOUR_REAL_CLIENT_ID.apps.googleusercontent.com
FRONTEND_ORIGINS=["http://localhost:5173","http://localhost:5174"]
COOKIE_SECURE=false
SESSION_DAYS=7
```

Then, still in `backend/`, with the virtual environment active:

```bash
alembic upgrade head
python -m app.content_cli import-draft ../content/published/dsa.json
```

The import prints its revision number. On a new database this will be 1:

```bash
python -m app.content_cli publish-db dsa 1
uvicorn app.main:app --reload --port 8000
```

Use the printed number if it differs from 1. Import creates a draft; the explicit
publish command makes it available to progress validation. The backend and bundled
Pages sheet must use the same reviewed manifest.

## Step 5: Run the frontend

In a second terminal:

```bash
cd /Users/ujjwalkumarjha/Desktop/thewhitecoder/thewhitecoder/frontend
cp -n .env.example .env.local
npm ci
```

Edit `frontend/.env.local`:

```dotenv
VITE_STATIC_SITE=1
VITE_GOOGLE_CLIENT_ID=YOUR_REAL_CLIENT_ID.apps.googleusercontent.com
VITE_API_BASE_URL=
```

Then:

```bash
npm run dev
```

Open the printed **localhost** URL, not `127.0.0.1`, because the origins above
register localhost. If Vite chooses another port, register that exact origin in
Google and `FRONTEND_ORIGINS`. Restart the backend/frontend after changing their
environment files.

## Step 6: Verify locally

1. Open `http://localhost:5173/#/sheets/dsa` and sign in with your Google account.
2. Check a question: the count becomes 1/241. Refresh and verify it remains checked.
3. Save notes, close the editor, refresh, and reopen the same question's notes.
4. Complete a topic, uncheck one question, and inspect its mixed state and count.
5. Clear that topic and verify the saved notes remain.
6. Sign out, then use another Google account: its progress starts independently,
   and it cannot see the first account's notes.
7. Inspect both light/dark modes and a narrow mobile viewport.
8. Stop the API while editing a note, try Save, and confirm the error preserves the
   draft and does not falsely report a successful save.

Run the project's checks before pushing:

```bash
# frontend/
npm run lint
npm run format:check
VITE_STATIC_SITE=1 npm run build

# backend/, with .venv active and PostgreSQL running
ruff check .
ruff format --check .
PROGRESS_TEST_DATABASE_URL='postgresql+psycopg://study_sheets:study_sheets_dev@127.0.0.1:5432/study_sheets' pytest -q
```

If using a managed development database, replace the test connection URL with its URL.

The PostgreSQL progress tests create isolated temporary schemas and remove them
after each test. Run them against a development database with schema-create
permission. CI provisions its own PostgreSQL database.

## Step 7: Host the API and database

Deploy FastAPI on a service capable of running Python, and provision PostgreSQL.
The Dockerfile can be built from the repository root:

```bash
docker build -f backend/Dockerfile -t thewhitecoder-api .
```

It includes the reviewed content manifest and starts one Uvicorn worker, using
`PORT` when supplied by the host.

Set these server-side variables on the API service:

```dotenv
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@DATABASE_HOST/DATABASE_NAME?sslmode=require
GOOGLE_CLIENT_ID=YOUR_REAL_CLIENT_ID.apps.googleusercontent.com
FRONTEND_ORIGINS=["https://thewhitecoder.com","https://www.thewhitecoder.com"]
COOKIE_SECURE=true
SESSION_DAYS=7
```

Use the provider's PostgreSQL connection URL, changing the scheme to
`postgresql+psycopg://` for SQLAlchemy. URL-encode special characters in credentials.
Run `alembic upgrade head`, then import/publish the DSA manifest using the commands
above on the hosted service. Bind **api.thewhitecoder.com** to that service and
enable its HTTPS certificate.

The API's cookies are Secure, HttpOnly, host-only, and SameSite=Lax. Keeping the
API on api.thewhitecoder.com and the frontend on thewhitecoder.com permits this
cookie arrangement. An unrelated hosting domain, or the github.io frontend URL,
is cross-site and will not work with these cookies. Set the API subdomain before
enabling the public login feature.

Configure database backups with the host. Limit API request bodies (for example,
64 KiB) and rate-limit the login and write endpoints at the API host/reverse proxy.
Do not log Google credentials, session cookies, CSRF tokens, or note bodies.
The application verifies Google's signature/audience/issuer/expiry and verified
email, binds login to a nonce, and checks the allowed origin and session CSRF token
before writes. Session tokens are stored as hashes and logout revokes them.

## Step 8: Configure the Pages build and publish after review

In GitHub **Settings → Secrets and variables → Actions → Variables**, add:

| Variable | Value |
| --- | --- |
| VITE_GOOGLE_CLIENT_ID | Your Google web client ID |
| VITE_API_BASE_URL | https://api.thewhitecoder.com |

These are public frontend configuration values. Database credentials stay only
on the API host. Without a configured client ID, the public sheet continues to
load and the account controls stay unavailable.

From the repository root:

```bash
git add -A
git commit -m "Add Google login and private DSA progress"
git push -u origin feature/google-progress
```

Review the branch and its PostgreSQL CI results. After the actual Google login,
two-account privacy check, mobile review, and hosted API checks pass, merge the
reviewed branch into main. The Pages workflow reads the two variables above.

## Content updates after launch

Import and publish the new reviewed manifest in the API database and deploy the
matching frontend bundle. If the two question sets differ, the interface blocks
writes and asks the student to refresh rather than saving progress against the
wrong question set. Stable keys keep existing completion and notes through title
changes and reordering within the same topic.

## Verification status of this package

Local automated coverage includes account isolation, logout/expiry, login nonce
and CSRF rejection, signed-token verification, notes validation, idempotent topic
completion, and revision-safe counts. PostgreSQL variants are included in CI.
The real Google popup and production database connection require the project
client ID and deployment configuration; those must be verified with the steps
above before public launch.
