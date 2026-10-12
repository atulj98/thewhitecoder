# Make The White Coder live

This guide assumes Google login, progress, notes, and the nested dropdown update
work locally. The production setup is:

| Address | Service | What it stores |
| --- | --- | --- |
| https://thewhitecoder.com | Existing GitHub Pages frontend | Public website files |
| https://api.thewhitecoder.com | Render FastAPI web service | Sessions and progress API |
| Private database URL | Render PostgreSQL 17 | Accounts, progress, notes, sheet revisions |

The supplied `render.yaml` defines paid API/database services in Singapore.
Review the actual charges Render displays before creating the Blueprint. Free
Render PostgreSQL expires after 30 days; the Free API sleeps on idle. See
[Render pricing](https://render.com/pricing) and
[Free service limits](https://render.com/docs/free).

## 1. Apply the launch patch and push your complete feature

Download `The_White_Coder_Production_Setup.patch`, then run from your project root:

```bash
cd /Users/ujjwalkumarjha/Desktop/thewhitecoder/thewhitecoder
git apply --check ~/Downloads/The_White_Coder_Production_Setup.patch
git apply ~/Downloads/The_White_Coder_Production_Setup.patch
git switch -c release/google-progress
git status --short
```

The patch builds on the Google-progress, import-order-fix, and nested-dropdown
updates already applied. Run the frontend checks:

```bash
cd frontend
npm run lint
npm run format:check
VITE_STATIC_SITE=1 npm run build
cd ../backend
source .venv/bin/activate
ruff check .
ruff format --check .
PROGRESS_TEST_DATABASE_URL='postgresql+psycopg://study_sheets:study_sheets_dev@127.0.0.1:5432/study_sheets' pytest -q
cd ..
```

Use your development database's actual URL if different. Stage from the root
so the backend and deployment files are included:

```bash
git add -A
git diff --cached --stat
git commit -m "Add Google login, saved DSA progress and production deployment"
git push -u origin release/google-progress
```

Your real `.env` and `.env.local` files are ignored by Git. Enter production
database credentials only in the hosting service's environment configuration.

Open [the pull request comparison](https://github.com/atulj98/thewhitecoder/compare/main...release/google-progress),
create the pull request, and merge when both CI jobs pass. The backend CI runs
against PostgreSQL. This publishes the UI on Pages; keep the Google frontend
variables empty until the hosted API passes step 3. Guests can browse the sheet
during this stage.

## 2. Create the API and PostgreSQL on Render

1. Open [Render Dashboard](https://dashboard.render.com/) and sign in.
2. Choose **New → Blueprint** and connect your GitHub account.
3. Select `atulj98/thewhitecoder`, branch `main`, and `render.yaml`.
4. When prompted for `GOOGLE_CLIENT_ID`, enter the same Google web client ID
   that works locally.
5. Review the API and database plans and charges. Create the Blueprint.

Render builds the existing Dockerfile, connects the API to PostgreSQL over its
private network, and runs `python -m app.release` before starting the API. The
release command upgrades migrations and initializes the 241-question DSA sheet
on a fresh database. Subsequent deployments verify the existing publication
without creating another revision or resetting student data. A different sheet
manifest stops the release and requires explicit reviewed publication.

The Blueprint sets secure cookies and allows the two HTTPS frontend origins.
It disables external database connections and waits for CI before subsequent
automatic API deployments. You do not need Docker installed on your Mac.

The API logs should show either **Initialized dsa publication** or
**Verified existing dsa publication**, followed by normal Uvicorn startup.
Open the service's assigned `https://...onrender.com/api/v1/health/ready` URL:
it must return `{"status":"ok"}` before continuing.

## 3. Connect api.thewhitecoder.com

In the API service's **Settings → Custom Domains**, locate `api.thewhitecoder.com`.
The Blueprint adds this hostname. Copy the DNS target Render shows. At the DNS
provider for thewhitecoder.com, add:

| Type | Name/Host | Target/Value |
| --- | --- | --- |
| CNAME | api | The API service's actual `...onrender.com` hostname |

The CNAME target is a hostname without `https://` or a path. Use a DNS-only
record during domain verification if your DNS provider offers proxying. In
Render, select **Verify** and wait for the HTTPS certificate to become active.
See [Render domain setup](https://render.com/docs/custom-domains) and
[DNS configuration](https://render.com/docs/configure-other-dns).

Check the custom API address from your terminal:

```bash
curl --fail --silent --show-error --max-time 20 https://api.thewhitecoder.com/api/v1/health/ready
curl --fail --silent --show-error --max-time 20 https://api.thewhitecoder.com/api/v1/sheets/dsa
```

The first returns `{"status":"ok"}`. The second returns the published sheet JSON.
Resolve any DNS, certificate, or database errors before enabling public login.
The frontend and API must use thewhitecoder.com addresses for the current
SameSite=Lax login cookies to work.

## 4. Enable Google sign-in on the live frontend

In your Google web client's **Authorized JavaScript origins**, confirm:

```text
https://thewhitecoder.com
https://www.thewhitecoder.com
```

Use the client's applicable public Audience/publishing settings. This integration
uses the Google Identity Services callback with basic identity only; it does not
require a redirect URL or a Google client secret.

In [GitHub Actions variables](https://github.com/atulj98/thewhitecoder/settings/variables/actions),
create these repository variables:

| Name | Value |
| --- | --- |
| VITE_GOOGLE_CLIENT_ID | The same Google web client ID as Render |
| VITE_API_BASE_URL | https://api.thewhitecoder.com |

Open [GitHub Actions](https://github.com/atulj98/thewhitecoder/actions), select
**Deploy frontend to GitHub Pages**, and choose **Run workflow**, branch `main`.
The build must run again because these values are embedded in the frontend
bundle. Wait for the Pages deployment to complete.

## 5. Confirm the complete live flow

Visit [the DSA sheet](https://thewhitecoder.com/#/sheets/dsa):

1. Browse as a guest; main topics and subtopics initially appear collapsed.
2. Sign in with Google and complete one question. The count increases.
3. Save a private note, refresh, and verify both the checkbox and note persist.
4. Mark a subtopic complete and uncheck one question; inspect the updated count.
5. Sign out and use a second Google account; verify its progress and notes are
   separate.
6. Check a mobile viewport and both themes. Test “Jump to a step”.

Successful Pages deployment alone verifies the public frontend. The live login,
saved progress, and private notes require the hosted checks above.

## Operating the live service

Verify the database's backup/restore settings and monitor API errors, connection
usage, and database storage. One initial API instance is a starting point for
1,000 registered accounts; measure actual concurrent usage before scaling.

For a reviewed content update, use the API service's Render Shell to fetch the
manifest from the exact reviewed Git commit (replace `REVIEWED_COMMIT_SHA`):

```bash
python - <<'PY'
from urllib.request import urlopen
from app.content_manifest import SheetManifest
from app.content_import import import_draft
from app.db.session import SessionLocal

commit = "REVIEWED_COMMIT_SHA"
url = f"https://raw.githubusercontent.com/atulj98/thewhitecoder/{commit}/content/published/dsa.json"
with urlopen(url, timeout=30) as response:
    manifest = SheetManifest.model_validate_json(response.read())
with SessionLocal() as db:
    revision = import_draft(db, manifest)
print(f"Imported private draft revision {revision}")
PY
python -m app.content_cli publish-db dsa PRINTED_REVISION_NUMBER
```

Run the publication only after the draft import succeeds. A failed changed-content
pre-deploy leaves the previous API version running. Publish the downloaded,
reviewed revision and retry deployment. Keep stable keys and deploy the matching
frontend. Existing progress and notes are retained.

For API-only fixes, a successful redeploy reruns the release command without
changing the DSA publication. Database backups, migrations, and content
publication are separate from reverting a frontend deployment.
