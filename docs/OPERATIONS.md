# Owner operations and handover

## Current services

| Component | Location / owner |
|---|---|
| Public site | https://extant.band — GitHub Pages |
| Repository | https://github.com/uit-ayeaye/extant-band — `main` |
| Telegram bot | https://t.me/extant_band_manager_bot — created through `@backbenchers_tester_com` |
| Bot backend | https://extant-band-manager.netlify.app |
| Netlify project | `extant-band-manager`, ID `d263779d-2555-43db-a035-fb8b2e84d80c` |
| Netlify team | `koshanlay1994` |
| Initial bot owner | Telegram numeric ID `6037040521` |
| GitHub bot credential | Fine-grained token; this repo only; Contents write, Actions read, Metadata read |
| Token expiry | 21 September 2027 — replace before expiry |

The client does not automatically own these infrastructure accounts. Everyday editorial access is ready through `/grant`, but legal/account ownership transfer requires the actual recipient's accounts.

## Editorial handover

1. Give the client `CLIENT-HANDBOOK.md` and the bot URL.
2. Have them press Start and send `/whoami`.
3. Verify the returned ID with the client and send `/grant ID` from the owner account.
4. Ask them to make a small draft, preview it, and cancel it. Then let them publish an approved change.
5. `/revoke ID` removes access immediately. Granting an editor does not reveal tokens.

To make a client an access administrator, add their verified numeric ID to `OWNER_TELEGRAM_IDS` in Netlify and redeploy. Keep the current owner until the client has verified the new access. Ordinary editors can publish and restore content but cannot grant access.

## Full infrastructure transfer

- Transfer the GitHub repository to the client's GitHub account or organization. Keep DNS and the Pages custom domain intact. Update `GITHUB_REPOSITORY`, replace the repository-scoped token under the new owner, and verify the webhook and Pages environment after the transfer.
- Transfer the Netlify project to the client's team through Netlify's supported transfer flow. Verify environment variables, Blobs data, production protection settings, and the scheduled maintenance function after transfer.
- In BotFather, use the bot's ownership-transfer flow when the client meets Telegram's account/security requirements. The current bot token remains server-side; rotate it after transfer and rerun `npm run bot:setup`.
- Replace the DeepSeek key with one billed to the client's account and redeploy.
- Transfer or delegate the `extant.band` domain separately with the registrar, preserving GitHub Pages DNS and HTTPS.
- Repeat the smoke test below before removing the original owner's access.

Do not send `.env`, Telethon session files, or private logs in the client project ZIP. Deliver credentials through the providers' own account/secret systems.

## Secrets and deployment

The local `.env` is ignored and permission-restricted. Netlify holds the runtime environment. GitHub Pages receives only `dist/`; it receives no API keys. `backend-public/` contains only the bot landing page. The GitHub token has no Workflows, Administration or Secrets permissions.

```sh
npm ci
npm run check
mkdir -p .local
npx --yes netlify-cli@27.8.0 link --id d263779d-2555-43db-a035-fb8b2e84d80c
npx --yes netlify-cli@27.8.0 env:import .env > .local/env-import.log
npm run bot:deploy
npm run bot:setup
```

Netlify's import command prints values, so keep its output private. Re-deploy after changing function environment variables. In Netlify, keep auto top-up disabled unless the owner deliberately enables paid usage. The public callback routes must be reachable by Telegram and GitHub; application-level authentication remains enforced.

The token expiry does not affect the already published site, but prevents further bot publication until renewed. Replace it with the same minimal scope, update `GITHUB_TOKEN`, redeploy, and verify `/status`.

## GitHub Pages and deployment messages

Pages uses GitHub Actions, with a build/test job followed by `actions/deploy-pages`. A signed `workflow_run` webhook reports success/failure to the Telegram chat associated with a bot commit. `/status` compares the branch head, matching workflow run, and `/revision.json` served from the public domain. A failed build leaves the prior successful deployment available.

To investigate missing notifications: inspect repository Settings → Webhooks deliveries, verify `/api/github` and the shared secret, and check Netlify function logs. Notification failure does not undo a committed edit; consult `/status` before republishing.

## Recovery

`/history` lists recent commits changing `content/site.json`; `/rollback SHA` previews that older content. It never resets Git history or restores old server code/secrets. All photo files remain in Git, so restored references keep working. The restoration target must be an ancestor of the current branch.

If a publish was interrupted after creating a commit, its draft stores that commit before advancing `main`. The bot checks whether the commit already reached the branch before retrying. Stale drafts are rejected rather than force-pushed. Background requests are stored durably and retried by the ten-minute maintenance job after interruption; after repeated failure the editor is asked to check saved progress and resend.

For an emergency with the bot unavailable: edit `content/site.json` locally, run `npm run check`, commit and push to `main`. Use `git show OLD_SHA:content/site.json > content/site.json` to restore content manually, then validate and commit. Do not use a force push to roll back content.

## Limits

- Text requests: 5,000 characters; at most five edit requests per minute per user.
- Photos: JPEG/PNG/WebP, 8 MB input, 40 million pixels maximum, resized to at most 2400 × 2400 and encoded as WebP; up to ten photos in one draft.
- Draft lifetime: 24 hours. Temporary records cleaned after seven days. Access audit records remain in private storage; published content history remains in GitHub.
- Client requests and public site data are sent to DeepSeek. No credentials are included in model prompts.
- Separate editors may draft concurrently; the first successful publication invalidates drafts based on the old branch head.
- Content capabilities cover the existing page, member list, photo gallery and video catalogue. New layouts, arbitrary HTML/JS, and large hosted video ingestion are intentionally outside the bot's scope.
- The backend is manually deployed via Netlify CLI. Content publishing is fully serverless and triggers GitHub Pages automatically. Backend code updates need an explicit Netlify deploy.

## Smoke test

1. `/start`, `/whoami`, `/status`, `/history` respond from the owner account.
2. A small text request produces the exact expected diff and a private preview, without a commit.
3. Publish once; verify one new commit, a passing Pages run, the deployment message, and the public revision.
4. `/rollback` to the prior content version; inspect the diff, publish, and verify restoration.
5. Stage a permitted photo, inspect its private preview, publish, then restore the earlier content.
6. Verify invalid webhook secrets receive 401, unknown users cannot edit, and cancelled/expired previews return 404.
