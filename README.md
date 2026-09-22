# EXTANT — official-style band site

Static site for **EXTANT**, a djent and metalcore band founded in Yangon, Myanmar in 2015.
Rebuilt from an earlier solo-artist portfolio into a full band site: the return from exile,
records, every video, the lineup, history and REBEL DOG · BITE BACK merch.

No build step, no dependencies. Open `index.html` or serve the folder.

```bash
python3 -m http.server 8099
```

## Structure

```
index.html          single page, eight sections
css/style.css       design system + all layout
js/main.js          release data, vault grid, auto-preview, filters, modal, reveals
assets/
  brand/            EXTANT logos, REBEL DOG "Bite Back" mark
  releases/         P Tripper poster, Revolution Means artwork, covers
  press/            live shots, video stills, The Voice stills
  merch/            REBEL DOG banner
  poster/           11 poster frames pulled from the videos themselves
  preview/          11 silent 8s loops (~3 MB) for the card auto-preview
  full/             11 full videos, VP9/WebM, source resolution (~272 MB)
  og/               1200x630 social card
  _source/          untouched originals (originals/ and legacy/)
```

## Design notes

**Colour.** The band's logo is acid lime on black, but lime everywhere reads as a UI theme
rather than a band. Lime is rationed to the logo mark, the primary CTA, and "live now"
signals. Labels, roles, years and meta use bone/ash/rust on a cold blue-black ground.
Blood red belongs to REBEL DOG. Change `--acid` usage in `css/style.css` if you want more
or less of it.

**Video.** Everything is served from this host. Cards preview themselves with a silent
8-second loop from `assets/preview` (hover on desktop, centre-of-viewport on touch);
clicking plays the full video from `assets/full` with native controls. "Watch on YouTube"
is a deliberate second click, not the default destination.

Full videos are the best resolution YouTube actually holds for each upload: the four modern
music videos (*P Tripper*, *Back Off*, *Main Character Syndrome*, *Dog Eat Dog*) are true
1080p; the 2020-21 lyric, live and studio videos are 640x360 because that is their source
resolution. Cards carry a badge so the two are not conflated.

Regenerating the media needs `yt-dlp` (2026.08 or newer — earlier builds can list the
1080p DASH formats but get HTTP 403 fetching them) and `ffmpeg`.

**Reveal animations** fail open. If the viewport reports zero height (background tab, some
embedded webviews) every element is shown immediately rather than left at `opacity: 0`.
The `IntersectionObserver`s are held in a `KEEP` array — an observer with no reachable JS
reference can be garbage collected while it still has live observations, which silently
blanks the page below the fold.

## Where the content came from

Everything on the page is transcribed from public sources, checked 30 Aug 2026:

| Fact | Source |
| --- | --- |
| 11 videos, view counts, dates, durations | [youtube.com/@extantband3863](https://www.youtube.com/@extantband3863) |
| The return, six-song concept album, HAIYAR | Extant Facebook announcement, Aug 2026 |
| "Cross The Rubicon" framing | Extant Facebook reel, Aug 2026 |
| Lineup, production and MV credits | P Tripper / Dog Eat Dog / Main Character Syndrome descriptions |
| Album *Aggressive Evolution*, TheBigBoyToy mix | *Back Off* video description |
| 28K followers, band bio | [facebook.com/Extantband](https://www.facebook.com/Extantband/) |
| Novem Htoo wins The Voice Myanmar 2019; career from 2010 | [Cambridge English interview, 17 Jun 2020](https://www.cambridge.org/elt/blog/2020/06/17/metal-fame-pronunciation-winning-voice-myanmar/) |
| *Revolution Means* — Burmese Guerrillas, Artists' Shelter | Extant Facebook release post |
| Merch names/copy, 12K followers, Tak contact | [facebook.com/mmrebeldog](https://www.facebook.com/mmrebeldog) |
| Solo catalogue | [Novem Htoo on Spotify](https://open.spotify.com/artist/2dEhuPUkMgVlbMHmXfUfAh) |

Hero "video plays" (54,115) is the sum of the eleven view counts in `js/main.js`, and the
filter chip counts derive from the same array — keep them in sync when updating.

## Updating releases

Add an entry to `RELEASES` at the top of `js/main.js` (`at` is the preview start second),
drop a thumbnail at `assets/video/<videoId>.jpg` — the code falls back to `i.ytimg.com` if
it's missing — then bump the chip count and hero total in `index.html`.

## Notes

- No song lyrics are reproduced anywhere on the site.
- `mmrebeldog.com` is registered but parked, so merch links point at the REBEL DOG Facebook
  page. Swap them when the store goes live.
- CSS/JS are versioned with `?v=N` query strings — bump on deploy to bust caches.
- Media, artwork and photography remain the property of EXTANT, REBEL DOG and their
  respective owners.

## Production domain

Public site: https://extant.band/ (GitHub Pages, main branch root).
The apex uses GitHub Pages A records; www is a CNAME to uit-ayeaye.github.io.
Keep CNAME, canonical URLs, social image URLs and sitemap aligned with this domain.
