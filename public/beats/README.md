# Beat assets

Drop your audio and cover art here. No code changes needed — the player
picks files up automatically from the URLs in `src/data/beats.ts`.

## Audio — `public/beats/audio/`

One MP3 (or WAV) per beat, named with the beat's `id`:

| Beat                | Filename                  |
| ------------------- | ------------------------- |
| Nightshade          | `nightshade.mp3`          |
| Cold Storage        | `cold-storage.mp3`        |
| Velvet Static       | `velvet-static.mp3`       |
| Lowlight            | `lowlight.mp3`            |
| Concrete Bloom      | `concrete-bloom.mp3`      |
| Signal Lost         | `signal-lost.mp3`         |
| Afterglow           | `afterglow.mp3`           |
| Patient Zero        | `patient-zero.mp3`        |

If a file is missing, the player falls back to a synthesised drum-loop
preview at that beat's BPM so the page still works.

## Cover art — `public/beats/covers/`

Optional, square images. Same filename convention with `.jpg`, `.png`,
or `.webp`:

```
public/beats/covers/nightshade.jpg
public/beats/covers/cold-storage.png
…
```

If a cover image is missing, a generated abstract label is painted onto
the CD using the beat's gradient.

## SoundCloud

If a beat has a public SoundCloud URL, set `soundcloudUrl` on its entry
in `src/data/beats.ts` and an "Open in SoundCloud" link appears on the
transport strip.
