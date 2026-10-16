# Apply Monochrome after the Learning Workspace update

This patch is an incremental update to the Learning Workspace already running
locally. It changes the light/dark palette, theme-colour metadata, and SVG logo.
It preserves saved theme preferences and does not change account configuration,
Google login, question keys, progress, notes, API routes, or database schema.

The light palette uses a `#F5F5F5` page, white panels, `#161616` text, and
`#242427` actions. The dark palette uses a `#0C0C0D` page, `#171719` panels,
`#F4F4F5` text/actions, and soft grey secondary text. Error messages retain
their existing semantic warning colour.

## Apply once

Download `The_White_Coder_Monochrome.patch` into Downloads. From anywhere inside
your existing working repository:

```bash
cd "$(git rev-parse --show-toplevel)"
git status
git apply --check ~/Downloads/The_White_Coder_Monochrome.patch
git apply ~/Downloads/The_White_Coder_Monochrome.patch
```

Stay on the existing `feature/learning-workspace` branch. The original workspace
changes may still be uncommitted; that is expected. This patch is made for that
state, so do not reapply the original Learning Workspace patch first. If the
check fails, stop and inspect/share the error rather than forcing an application.

## Review locally

Keep the local backend running. Restart the frontend from its terminal with
Ctrl+C, then:

```bash
cd "$(git rev-parse --show-toplevel)/frontend"
npm run dev -- --port 5173 --strictPort
```

Retain the existing `frontend/.env.local`, with `VITE_STATIC_SITE=1`, your real
`VITE_GOOGLE_CLIENT_ID`, and a blank `VITE_API_BASE_URL` for local development.
Retain the existing `backend/.env` and virtual environment. No dependency
installation, new migration, data import, or database reset is required.

Open **http://localhost:5173/#/sheets/dsa** and switch between Light and Dark.
Check the logo on both backgrounds, the home page, keyboard focus, and the
selected-question highlight. The mode is stored using the same local preference
key as before; an existing dark preference therefore continues to open dark.

```bash
npm test
npm run lint
npm run format:check
VITE_STATIC_SITE=1 npm run build
```

The existing 14 workspace behavior tests pass with this palette. The production
build, formatting, and lint checks also pass. The foreground/background token
pairs used for regular text and actions were checked at a contrast ratio of at
least 4.5:1 in both themes. A final visual review on your Mac is still required.

After local approval, commit this update together with the workspace changes on
the feature branch. The original local review guide has the PR and deployment
steps. Applying this patch alone does not push or deploy anything.
