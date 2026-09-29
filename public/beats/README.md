# Beat assets

Drop your audio and cover art here. No code changes needed — the player
picks files up automatically from the URLs in `src/data/beats.ts`.

## Audio — `public/beats/audio/`

One MP3 (or WAV) per beat, named with the beat's `id`:

| Beat                | Filename                  |
| ------------------- | ------------------------- |
| Homerun             | `homerun.mp3`             |
| Virtual Love        | `virtual-love.mp3`        |
| Switch              | `switch.mp3`              |

These three are the real songs. (Earlier versions of this table listed
placeholder beats that never existed; they were removed.)

If a file is missing, the player falls back to a synthesised drum-loop
preview at that beat's BPM so the page still works.

## Cover art — `public/beats/covers/`

Optional, square images. Same filename convention with `.jpg`, `.png`,
or `.webp`:

```
public/beats/covers/homerun.jpg
public/beats/covers/virtual-love.png
…
```

If a cover image is missing, a generated abstract label is painted onto
the CD using the beat's gradient.

## SoundCloud

If a beat has a public SoundCloud URL, set `soundcloudUrl` on its entry
in `src/data/beats.ts` and an "Open in SoundCloud" link appears on the
transport strip.
