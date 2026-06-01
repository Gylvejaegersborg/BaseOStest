# Artist library assets (Beat DB)

Drop real artist files here and point an entry in `src/data/library.ts` at
them. No code changes beyond the data entry are needed — the Beat DB picks
files up automatically from the URLs.

Audio is shared with the public Beat Store and lives under
`public/beats/audio/` (see `public/beats/README.md`). Everything else goes
here, grouped however you like:

```
public/library/
  artwork/   homerun.png, nightshade.jpg, isark-logo.svg …
  video/     switch-official.mp4, homerun-reel.mp4 …
```

## Wiring an asset

Each asset in `src/data/library.ts` has a `category` (beat · song · lyrics ·
artwork · music-video · social-video · stem · note) and optional file fields:

| Field        | Used for                              |
| ------------ | ------------------------------------- |
| `audioFile`  | beats / songs — same-origin mp3 / wav |
| `coverImage` | artwork (also cover for audio/video)  |
| `videoFile`  | music / social video — same-origin    |
| `videoUrl`   | external embed (SoundCloud, YouTube)  |
| `body`       | lyrics / notes — markdown             |

If a file is missing the preview falls back gracefully: audio plays a
synthesised drum loop at the beat's BPM, artwork paints the gradient, and
video shows a poster with an external link. So you can register an asset
before the real file exists.
