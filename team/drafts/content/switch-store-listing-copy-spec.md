# Switch — store listing copy spec

> Handoff: t-store-discoverability-audit-fix-nyx. Switch has no store listing yet —
> `src/data/beats.ts` carries its structured data (bpm, key, mood, audioFile) but this
> is the spec for what its listing copy needs the moment a listing entry gets created,
> so that work doesn't start from zero after upload. Content-copy spec only — no live
> store edit, no outward publish.

## Why this exists separately from the upload package

`team/drafts/uploads/switch/` already has a full metadata/description/tags set — but
that package is written for SoundCloud/YouTube upload, not the in-OS beat store
listing. Same track, different surface, different job: the upload description sells
the track to a listener; the store listing needs to sell it to a *searcher* landing
on the store with zero context, then convert to a license purchase. This spec keeps
the two distinct rather than assuming one covers the other.

## Current known data (from `src/data/beats.ts`)

```
id: switch
title: Switch
artist: ISΛRK × 10k.emraan
bpm: 186
musicalKey: C min
mood: ['Drill', 'Hard']
durationSec: 100
audioFile: /beats/audio/switch.mp3
licenses: MP3 $24.99 / WAV $49.99 / Stems $99 / Exclusive negotiable (standard tier set)
```

No `coverImage`, no `soundcloudUrl` yet — both still open per the upload package's
[TBD] list (beat store URL, publish time — see `t-switch-upload-package`).

## Listing tags (store search box, literal strings)

Reuses the already-finalized upload-package tag set verbatim
(`team/drafts/uploads/switch/metadata.json`) rather than re-deriving — one source of
truth for Switch's search terms across both surfaces:

```
drill, uk drill, melodic drill, hard beats, beats for rappers, free beats,
type beat, dark type beat, electronic, ISARK, 10k.emraan, 2026 beats,
free type beat 2026, drill type beat, hard instrumental
```

Add two store-specific literal-match terms not needed for the upload description but
useful for an on-site search box: `186 bpm` and `c minor` as standalone tag strings
(the upload metadata carries these as structured `bpm`/`musicalKey` fields already —
this spec adds them as literal searchable text too, consistent with the audit's core
finding that structured fields alone don't satisfy text search).

## Listing description (store card / detail view — short)

Two lengths, matched to where the storefront likely needs them (card blurb vs. detail
page) — write both now so neither blocks the other later:

**Card / short (one line, for a grid tile):**
> 186 bpm drill instrumental, C minor. ISΛRK × 10k.emraan.

**Detail page (full):**
> Switch — ISΛRK × 10k.emraan
>
> 186 bpm drill instrumental in C minor. everything flips — tempo, direction,
> weight. built for the moment a track stops asking permission.
>
> produced by ISΛRK. co-produced by 10k.emraan.
>
> MP3 · WAV · stems · exclusive licenses available. credit "prod. ISΛRK ×
> 10k.emraan" on non-exclusive use.

(First two lines of the detail copy reused verbatim from `description.md`'s opening —
keeps the two surfaces consistent rather than fragmenting Switch's voice across
upload description vs. store listing.)

## What the listing needs before it can go live (checklist, not yet actionable)

- [ ] beat store URL slug (still [TBD] across the upload package — same blocker,
      not a new one)
- [ ] cover image or confirm gradient fallback (`gradient: ['#A78BFA', '#150A33']`
      already in `src/data/beats.ts`, usable as-is if no separate cover art lands —
      Switch already has an `art-prompt.md` for upload thumbnails; that art, once
      produced, would also be the natural store cover image, one asset for both)
- [ ] confirm `soundcloudUrl` field gets populated once the SoundCloud upload is
      live, so the store listing can link out
- [ ] licenses: standard 4-tier set already applies via the shared `licenses()`
      helper — no per-track override needed unless ISΛRK wants Switch-specific
      pricing (collab track, co-producer credit — worth a deliberate check, not
      assumed identical to solo tracks, flagging this as a decision point rather
      than quietly defaulting it)

## Explicit non-decision

This spec does not decide whether Switch gets a *different* price tier than the rest
of the catalog because it's a two-producer collab. That's a pricing/splits decision
tied to `ap-2026-07-06-collab-confirm-10k-emraan` (still pending, no contact channel
confirmed with 10k.emraan yet) — flagging the dependency rather than silently assuming
the standard `licenses()` set applies unmodified.
