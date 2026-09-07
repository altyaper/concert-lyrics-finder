# LetraLista

A static, mobile-first concert setlist and browser-local lyrics prompter.

## What it does

- Includes the 11 songs readable in the supplied concert screenshot.
- Filters instantly by song or artist, ignoring accents and case.
- Opens prefilled lyric searches in Google or Genius.
- Loads authorized, publishable lyrics from `lyrics.json` at startup.
- Lets the user paste local lyric edits, which override `lyrics.json` in that browser.
- Stores pasted edits only in that browser's `localStorage`—there is no backend or database.
- Presents saved lyrics as a large fullscreen prompter with font size, speed, play/pause, restart, fullscreen, and best-effort screen wake lock.
- Installs as a PWA and retains the static app shell offline.

`lyrics.json` contains one entry for every song ID. Its values start empty and may contain only lyrics the publisher owns or has permission to publish. Because this is a public repository and website, text added there is public. The app does not scrape lyric sites.

## Adding authorized lyrics

Edit the matching value in `lyrics.json` and preserve line breaks with JSON `\n` escapes. The app validates IDs and text when it loads. Browser-local edits take priority over the bundled JSON value.

## Commands

```bash
npm test
npm run build
python3 -m http.server 4199 --bind 127.0.0.1
```

The publish directory is the repository root. No build output or server runtime is required.

## Setlist provenance

Titles, artists, and durations were transcribed from the user-provided screenshot. The screenshot cuts off immediately below “Ruca”; no songs below it are assumed. The two visually ambiguous metadata entries were checked with the public MusicBrainz recording search:

- `Ojos Cerrados` — Banda Sinaloense MS de Sergio Lizárraga & Carín León
- `Ruca` — Carín León

MusicBrainz search responses were used only to validate metadata; no lyrics or artwork are bundled.
