# Store discoverability audit — tag + description rewrites

> Handoff: t-store-discoverability-audit-fix-nyx (from Hemera's 2026-07-09 diagnosis
> of t-store-discoverability-audit). Content-copy draft only — no live store edit, no
> outward publish, nothing queued to approvals/queue.json. Flag to Hemera before any
> of this gets treated as final and applied to `src/data/beats.ts`.
>
> Grounded directly in `src/data/beats.ts` as of 2026-07-09 — no invented genres,
> moods, or specs beyond what's in the file. bpm/musicalKey/mood are real fields;
> `description` is not a field on `Beat` today (see note at bottom).

## The gap, stated plainly

`Beat` has `bpm`, `musicalKey`, and `mood` as structured data, and the storefront UI
presumably surfaces them as filters/labels somewhere — but there's no free-text field
where "186 bpm," "C minor," "type beat," or genre-adjacent search phrasing actually
lives as literal, matchable text. A buyer typing "dark trap type beat 140 bpm" into a
search box has nothing to match against except structured filters they'd have to
already know exist. Mood arrays (`['Hard', 'Trap']`) are accurate but thin — they're
labels, not search hooks. This doc fixes both: literal searchable tag strings per
track, and short discovery-oriented descriptions.

Two things this doc does NOT do: invent a `description` field on the `Beat` type (that's
a schema change, flagged below, not a content-copy decision) or touch any file under
`src/`.

---

## Tag philosophy

Pull directly from the Switch upload package precedent (`team/drafts/uploads/switch/metadata.json`),
which already established the working pattern for this catalog: literal bpm, literal key,
mood-as-search-term, "type beat" phrasing (the dominant real-world search pattern for
instrumental beat discovery), and artist name. Applying that same pattern consistently
across the rest of the catalog below — nothing new invented, just extended.

Every tag list below follows the same shape:
1. bpm as a literal string (`"140 bpm"`)
2. key as a literal string (`"a minor"`)
3. mood terms already in the data, lowercased, plus their natural "type beat" pairing
4. artist tag
5. 1-2 genre-adjacent terms that are a direct, defensible read of the existing mood
   array — not a new genre claim

---

## Per-track rewrites

### Homerun (`id: homerun`)
- current data: 140 bpm, A min, mood `['Hard', 'Trap']`, has `audioFile`
- **new tags**: `140 bpm`, `a minor`, `hard`, `trap`, `hard trap`, `trap type beat`,
  `dark trap instrumental`, `ISARK`, `hard beats`, `trap beat 2026`
- **description** (search-hook phrasing, factual): "140 bpm trap instrumental in A
  minor — hard, heavy-footed, built to hit. prod. ISΛRK."
- rationale: "hard trap" is a direct compound of the two existing mood tags, not a new
  claim. no genre invented beyond trap/hard.

### Virtual Love (`id: virtual-love`)
- current data: 110 bpm, C maj, mood `['Lo-fi', 'Warm', 'Smooth']`, has `audioFile`
- **new tags**: `110 bpm`, `c major`, `lo-fi`, `lofi type beat`, `warm`, `smooth`,
  `chill instrumental`, `lofi beat 2026`, `ISARK`, `study beat`
- **description**: "110 bpm lo-fi instrumental in C major — warm, smooth, low-key.
  prod. ISΛRK."
- rationale: "chill instrumental" / "study beat" are standard real-world search terms
  for the lo-fi mood category specifically (not invented — this is the well-established
  search vocabulary that surrounds the "lo-fi" tag already in the data). flagging this
  one as an assumption about buyer search behavior, not a catalog fact: I can't verify
  actual search volume from here.

### Switch (`id: switch`)
- current data: 186 bpm, C min, mood `['Drill', 'Hard']`, has `audioFile`,
  artist `ISΛRK × 10k.emraan`
- **tags**: already drafted and finalized in `team/drafts/uploads/switch/metadata.json`
  for the upload package specifically. Store-listing tags should match that list once
  the listing exists — see the separate spec doc
  (`team/drafts/content/switch-store-listing-copy-spec.md`) rather than duplicating it
  here. Not re-derived from scratch.

### Nightshade (`id: nightshade`)
- current data: 142 bpm, F# min, mood `['Dark', 'Trap']`, **no `audioFile`** (placeholder)
- **new tags**: `142 bpm`, `f# minor`, `dark`, `trap`, `dark trap type beat`,
  `sinister instrumental`, `ISARK`, `trap beat 2026`
- **description**: "142 bpm dark trap instrumental in F# minor. prod. ISΛRK."
- flag: this track has no real audio file in the repo (per `t-nightshade-q4-reentry`,
  off the Q3 board, Q4 carry-over undated). Tags/description are drafted here for
  completeness of the audit, but should NOT go live on the store ahead of an actual
  audio asset landing — that would list a track that isn't purchasable/streamable yet.
  Flagging explicitly rather than silently including or silently omitting.

### Cold Storage (`id: cold-storage`)
- current data: 138 bpm, C min, mood `['Ambient', 'Drill']`, **no `audioFile`** (placeholder)
- **new tags**: `138 bpm`, `c minor`, `ambient`, `drill`, `ambient drill type beat`,
  `atmospheric instrumental`, `ISARK`
- **description**: "138 bpm ambient drill instrumental in C minor — atmospheric, spaced
  out. prod. ISΛRK."
- flag: same as Nightshade — no `audioFile` field, placeholder status per Argus's
  2026-06-22 audit (confirmed again by Theia 2026-06-29 and 2026-07-06). Same
  recommendation: don't list live until real audio lands.

### Lowlight (`id: lowlight`)
- current data: 124 bpm, D min, mood `['R&B', 'Smooth']`, no `audioFile`
- **new tags**: `124 bpm`, `d minor`, `r&b`, `rnb type beat`, `smooth`, `sultry
  instrumental`, `ISARK`, `rnb beat 2026`
- **description**: "124 bpm R&B instrumental in D minor — smooth, late-night pocket.
  prod. ISΛRK."
- flag: no `audioFile` — same live-listing caveat as above.

### Signal Lost (`id: signal-lost`)
- current data: 145 bpm, E min, mood `['Experimental', 'Trap']`, no `audioFile`
- **new tags**: `145 bpm`, `e minor`, `experimental`, `trap`, `experimental trap type
  beat`, `glitchy instrumental`, `ISARK`
- **description**: "145 bpm experimental trap instrumental in E minor — off-grid, glitch
  textures. prod. ISΛRK."
- rationale: "glitchy" / "off-grid" are a direct read of "experimental" paired with
  trap, not a new claim — flagging as light interpretive language, not a hard fact
  about the audio (I haven't heard it; no inbox record exists for this track either).
- flag: no `audioFile` — same live-listing caveat.

### Afterglow (`id: afterglow`)
- current data: 130 bpm, Bb maj, mood `['Warm', 'Pop']`, no `audioFile`
- **new tags**: `130 bpm`, `bb major`, `warm`, `pop`, `pop type beat`, `feel good
  instrumental`, `ISARK`, `pop beat 2026`
- **description**: "130 bpm pop instrumental in Bb major — warm, open, feel-good.
  prod. ISΛRK."
- flag: no `audioFile` — same live-listing caveat.

---

## Structural flag — not a content-copy decision, surfacing it anyway

`Beat` (`src/data/beats.ts`) has no `description` field today — only `title`, `mood[]`,
and structured numeric/string fields. These description rewrites above assume the
storefront either (a) already renders a description somewhere the audit didn't catch,
or (b) needs a new field added to actually use this copy. That's a schema/UI change,
which is out of scope for a content draft and out of scope for what I'm allowed to
touch (`src/` is off-limits in a team run). Flagging to Hemera: if the storefront has
nowhere to display these descriptions today, the real fix is two-part — a small `src/`
schema change (user or a future non-team-run pass) plus this copy — and that split
should be named explicitly rather than this doc quietly assuming a field that doesn't
exist yet.

Tags have the same open question at a smaller scale: there's no `tags: string[]` field
on `Beat` either, only `mood: string[]`. The tag lists above are written as literal
search strings ready to drop into a new `tags` field, or to fold into an expanded
`mood` array, or to live in whatever the storefront's actual search index reads from
— whichever the eventual schema decision picks. Not assuming which.

## What's NOT included here

No invented BPM/key values (all pulled directly from `src/data/beats.ts`). No invented
genre categories beyond direct compounds of existing `mood` entries. No stream counts,
chart claims, or "trending" language — nothing here claims performance data the catalog
doesn't carry. No live audio was heard or analyzed for any of these seven tracks; mood
language stays anchored to the existing `mood[]` field, not new listening-based claims.
