# EXTANT — band portfolio and Telegram content manager

Public website: https://extant.band · Bot: https://t.me/extant_band_manager_bot

The site remains static on **GitHub Pages**. A separate **Netlify Functions** backend lets approved Telegram users edit content using DeepSeek, preview changes, publish a Git commit, and restore previous content snapshots.

## Local development

Requires Node 22 or newer.

```sh
npm ci
npm run check
python3 -m http.server 8099 --directory dist
```

`npm run build` renders `templates/index.html` with `content/site.json` into `dist/`. It copies public assets only; source originals, code, credentials and drafts are not included in the Pages artifact. The root `index.html` is a legacy snapshot; the deployed site is built from the template and content file.

## Content

- `content/site.json`: member profiles, release archive, gallery, text blocks, links, image references, metadata and section visibility.
- `templates/index.html`: fixed page structure with content binding attributes.
- `lib/content.mjs`: strict schema, supported edit paths, markup sanitization and diffs.
- `lib/render.mjs`: shared static-site and private-preview renderer.
- `js/main.js`, `css/style.css`: interactions and visual design.
- `assets/`: original portfolio media plus bot-managed `uploads/`.

Historical video credits preserve the names originally transcribed from the videos. Oo Japan's current member profile uses the name requested by the client. See [research and evidence notes](docs/RESEARCH.md).

## Backend

- `/api/telegram`: validates Telegram's secret header and queues durable updates.
- `process-background`: performs authorized commands, DeepSeek proposals and GitHub writes.
- `/preview/:token`: expiring, unguessable draft preview and complete diff; unpublished images remain private to that link.
- `/api/github`: verifies signed GitHub workflow notifications and reports deployment success/failure.
- `maintenance`: retries interrupted work and cleans temporary records after seven days.

Netlify Blobs stores drafts, jobs, upload staging, access records and audit records. Conditional writes serialize per-user work and publishing; branch updates use non-forced Git ref updates against the draft's base commit. An uncertain publish is recoverable through its saved commit. The AI can edit only validated content; it never receives credentials or writes arbitrary repository files.

## Delivery documents

- [Client handbook](docs/CLIENT-HANDBOOK.md)
- [Owner operations and handover](docs/OPERATIONS.md)
- [Research and content audit](docs/RESEARCH.md)

## Deployment

GitHub Actions `.github/workflows/pages.yml` runs tests, builds an allowlisted static artifact, and deploys it to Pages. Configure Pages to use GitHub Actions; retain the `extant.band` custom domain. Bot commits trigger the same workflow.

`netlify.toml` deploys **only the bot backend and its landing page**, not the portfolio. Configure the variables in `.env.example` as Netlify environment variables. Never commit a populated `.env` or export secrets to `dist/`.

```sh
npx netlify link --id YOUR_NETLIFY_PROJECT_ID
# CLI import prints values: redirect its output to a private ignored file.
npx netlify env:import .env > .local/env-import.log
npm run bot:deploy
npm run bot:setup
```

Set up a repository webhook for `workflow_run`, targeting `BOT_BASE_URL/api/github` with `GITHUB_WEBHOOK_SECRET`. The runtime GitHub token needs only Contents read/write and Actions read on this repository; repository Administration or Workflows write permissions are unnecessary. Keep initial deployment and hook administration on your local authenticated GitHub CLI.

Everyday client content work requires no local machine or server process. Backend code changes require another Netlify deployment.

## Media and ownership

The existing 11 video previews and full videos remain locally hosted. New YouTube-only records link to YouTube when no hosted video exists. Music, photographs, artwork and merchandise remain the property of EXTANT, REBEL DOG and their respective owners. No song lyrics are reproduced.
