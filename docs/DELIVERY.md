# EXTANT delivery — 22 September 2026

Website: https://extant.band  
Content manager: https://t.me/extant_band_manager_bot  
Source: https://github.com/uit-ayeaye/extant-band

## What is ready

The updated portfolio includes Oo Japan (Idiots) in the current lineup, expanded supported background for Novem Htoo, and an evidence dossier distinguishing verified sources from inherited claims. The page keeps its existing design, domain and video archive.

Approved Telegram users can request content edits in English or Burmese, upload photos, revise drafts, review private previews and complete diffs, publish to GitHub Pages, check deployment status, and restore previous content versions. DeepSeek proposes changes; publication requires the editor's Publish action. The bot cannot change application code, layout or credentials.

The website runs on GitHub Pages. The bot runs on Netlify Functions and Blobs, with no continuously running server or local computer required. GitHub and Telegram webhooks are authenticated, and the GitHub runtime token is limited to this repository. Provider quotas, account maintenance and AI usage charges still apply.

## Live acceptance checks completed

- Owner account `@backbenchers_tester_com` authenticated as Telegram ID `6037040521`; `/start`, `/whoami`, `/history` and `/status` responded.
- A real Telegram photo upload was resized and encoded as WebP, with a working private image preview. A follow-up text request revised its caption while keeping the uploaded photo.
- Publish button created [commit e51fa59](https://github.com/uit-ayeaye/extant-band/commit/e51fa590e84a7beb6728c7d7e3d66632a71ac587), changing only the content document and uploaded image. [Pages run 35711269985](https://github.com/uit-ayeaye/extant-band/actions/runs/35711269985) passed. The live photo and revision were verified, and Telegram received the deployment notification.
- `/rollback e84cc4b` prepared a restoration diff. `/publish` created [commit 6725e0a](https://github.com/uit-ayeaye/extant-band/commit/6725e0a7cbff233324b2545e8ef8e4f9f8cb62c4). [Pages run 35711463043](https://github.com/uit-ayeaye/extant-band/actions/runs/35711463043) passed. The content document exactly matches the pre-test version, including Oo Japan's profile. The test gallery is hidden again; Git history retains the uploaded asset.
- The Cancel button discarded a separate draft. Cancelled and published preview URLs returned 404. Unauthenticated Telegram and GitHub webhook requests returned 401.
- All 13 automated tests passed, covering content validation, unsafe markup/URLs, renderer output, Git publishing, stale changes and Telegram sender checks. The build passed and the runtime dependency audit reported zero known vulnerabilities at delivery. No configured secret values were found in tracked files.
- Desktop and mobile member profiles were visually checked, as was the published desktop gallery.

## Give the client access

1. Send the client the bot URL and [client handbook](CLIENT-HANDBOOK.md).
2. They press Start and send `/whoami`.
3. From the owner Telegram account, send `/grant THEIR_NUMERIC_ID` after verifying that ID with the client.
4. Have them preview a small edit and cancel it, then publish an approved update.

No client account has been granted access yet because the recipient's verified Telegram ID has not been supplied. This is the only remaining step for everyday editorial access.

For full ownership of the repository, Netlify project, Telegram bot, domain and AI billing, follow [owner operations and transfer instructions](OPERATIONS.md). These services currently remain under the existing owner accounts. The repository-scoped GitHub token expires on **21 September 2027**.

The source ZIP contains tracked project files only. It intentionally excludes credentials, Telethon sessions, private drafts/logs, dependencies and build caches. Use the providers' account-transfer tools for credentials and ownership.

Read the [research audit](RESEARCH.md) before presenting the site as an authoritative band press kit; some earlier 2025–2026 claims still need confirmation from the band.
