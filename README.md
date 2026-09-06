# LetraLista

A static, mobile-first concert setlist and browser-local lyrics prompter.

## What it does

- Includes the 11 songs readable in the supplied concert screenshot.
- Filters instantly by song or artist, ignoring accents and case.
- Opens prefilled lyric searches in Google or Genius.
- Lets the user paste lyrics they have permission to use.
- Stores pasted lyrics only in that browser's `localStorage`—there is no backend or database.
- Presents saved lyrics as a large fullscreen prompter with font size, speed, play/pause, restart, fullscreen, and best-effort screen wake lock.
- Installs as a PWA and retains the static app shell offline.

The public app intentionally ships with no full song lyrics. Song lyrics are copyrighted, and this repository does not copy content from lyric sites.

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
