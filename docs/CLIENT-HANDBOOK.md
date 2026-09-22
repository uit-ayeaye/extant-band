# EXTANT website — client handbook

Website: https://extant.band

Telegram manager: https://t.me/extant_band_manager_bot

## Get access

Open the bot, press Start, and send `/whoami`. Give that numeric ID to the site owner. The owner sends `/grant YOUR_ID`. Usernames alone do not grant access, and group chats cannot edit the site. Clients do not need GitHub or Netlify logins for everyday content work.

## Make an edit

1. Describe the change in English or Burmese. Include the exact text, name, date or link you want.
2. The bot sends a draft, a private website preview, and a full before/after report.
3. Open both links and check the change. You can send a follow-up correction to revise your pending draft.
4. Tap **Publish**, or use `/publish`. Use **Cancel** or `/cancel` to discard it.
5. Wait for the deployment result. `/status` shows the GitHub build and the revision the public website is serving.

Nothing is published just because you sent an edit request. Drafts expire after 24 hours. If another editor published while you were reviewing, the bot asks you to start a fresh draft so it cannot overwrite their work.

Examples:

- `Change Oo Japan’s biography to: [approved biography]`
- `Update the booking link to https://...`
- `Hide the merch section for now`
- `Remove the gallery photo with caption “[caption]”`
- `Oo Japan ရဲ့ bio ကို ဒီစာသားနဲ့ ပြောင်းပေးပါ: [စာသား]`

For photos, send a JPEG, PNG or WebP (up to 8 MB) with a caption such as `Add this to the gallery. Caption: Live in Yangon. Alt text: EXTANT performing on stage.` Or `Use this as Oo Japan’s portrait; alt text: Oo Japan at the drum kit.` Send one photo per request; albums arrive as separate requests. Photos are resized and metadata is removed before publishing.

For new videos, provide the YouTube URL, title, publication date, duration and credits. New videos can link out to YouTube. Adding full hosted video files or generating silent previews needs a developer; Telegram video uploads are not implemented.

## Restore an earlier version

Send `/history` and copy the seven-character commit ID you want. Send `/rollback COMMIT`. The bot prepares a restoration draft; review it and tap Publish. Restoration adds a new commit, so later you can restore the newer version too. It restores website content, including references to uploaded photos, without rewinding application code or security settings.

Removing a photo from the website does not erase it from the public repository's historical versions. Contact the owner if a file needs permanent removal from Git history.

## Owner commands

- `/access`: list configured owners and editors.
- `/grant NUMERIC_ID`: allow an editor to draft, publish and restore content.
- `/revoke NUMERIC_ID`: remove editing access. Owner access is held in server configuration.

Verify the ID directly with the client before granting access. Owner and editor roles differ only in access administration; approved editors can publish all supported site content.

## What needs the developer

Page layout, new types of sections, CSS, application code, domain changes, integrations, secrets, and large audio/video uploads. The AI is limited to the content model; it cannot run commands or rewrite the application.

## Data and service costs

Your requests and the current public website content go to DeepSeek. Private drafts and temporary photos are stored in Netlify. Published content and photos become public in GitHub and on the website. Do not send personal credentials or private documents. Preview links are secret links: anyone holding an unexpired link can read it.

There is no continuously running server. GitHub Pages hosts the website; Netlify runs the bot on demand and performs ten-minute recovery/cleanup checks; DeepSeek handles text requests. Provider quotas and usage charges still apply. The owner must maintain the service accounts and API balance. An unavailable bot does not take the public website offline.
