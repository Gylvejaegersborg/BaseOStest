# Switch — W26 waveform visualizer asset spec

for: IG/TikTok post #2, week of June 22–28 ("process" week)
referenced in: `team/drafts/content/switch-prerelease-arc-w25-w28.md` (W26, assets needed)

---

## what this is

a spec for a waveform/frequency visualizer clip, NOT the clip itself. this does not depend
on the Aether hook-moment timestamp, the beat store URL, or the publish time — it can be
built or commissioned now. the only thing it still needs downstream is the actual audio
clip to render against, which is a separate, smaller ask than the full hook-moment call
(see notes below).

---

## visual spec

- format: 15–30 sec vertical (9:16), matches the rest of the arc's short-form sizing
- background: cover art (static) or a slow zoom (2–4% scale over the clip duration) — pull
  from `team/drafts/uploads/switch/art-prompt.md` once art exists, or use the site gradient
  `#A78BFA → #150A33` as a placeholder background if art isn't ready by W26
- foreground: a single waveform or bar-style frequency visualizer, thin lines, cold violet
  (`#A78BFA` or `#7C3AED`), centered or bottom-third placement — not full-screen, leave
  negative space
- no logo, no handle watermark baked in (platform handles that)
- text: none during playback. optional end card matching W25's title card style:
  `SWITCH` / `ISΛRK × 10k.emraan` / `07.18`

## audio source note

this can be rendered against ANY 15–30 sec section of Switch, not necessarily the hook
moment Aether is identifying — the W25 clip needs the single best 3-second hook because
it's a cold-open attention grab; this W26 clip is a "show the track moves" beat and works
with any sustained, rhythmically active section. if a temp/working mix or stem exists,
that's enough to render a draft visualizer even before Aether's hook call lands.

## tooling options (pick one, no preference encoded — ISΛRK's call)

- after effects / premiere native audio spectrum effect
- a free web tool (e.g. Kapwing, CapCut's built-in audio visualizer) for a fast turnaround
- a simple ffmpeg `showwaves`/`showspectrum` filter render if a CLI pass is preferred —
  command can be written on request once a source file is available

## caption (already drafted in the arc, repeated here for the asset owner)

> `186 bpm. c minor. it moves.`

---

*this is a spec, not finished content. the rendered clip still needs to go through the
normal draft → approval queue → publish flow once it exists.*
