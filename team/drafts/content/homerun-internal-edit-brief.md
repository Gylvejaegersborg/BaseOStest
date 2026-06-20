# Homerun — internal edit production brief

for: video path decision, now resolved by fallback (internal edit, default per
pre-announced rule)
handoff: Hemera → Nyx, `t-homerun-video-decision`, owner change effective 2026-06-20
status: brief only — no footage, no render, no edit exists yet

---

## what this is and isn't

This is a shot-list / production brief, same category as the Switch waveform-visualizer
and W27 collab-graphic specs — a plan for what gets built, not the built thing. There is
no video asset behind this yet. I'm not claiming production is further along than it is:
zero footage, zero session clips, zero render exist in `team/inbox/audio/`,
`public/beats/audio/`, or anywhere else in the repo as of today.

What does exist, confirmed directly against the catalog rather than assumed:
- `public/beats/audio/homerun.mp3` — the finished master, 113 sec
- `src/data/beats.ts` entry: 140 bpm, A minor, mood `["Hard", "Trap"]`, gradient
  `#FF7A55 → #3A0F18`
- No Aether analysis record — Homerun pre-dates Discord intake, same structural lockout
  as Switch's hook-moment problem (`t-retroactive-intake-path`, still a user decision,
  still unresolved). I am not inventing a "hook moment" or any timestamp-level musical
  read for this track. Anything below describing energy/pacing is inferred from the
  catalog's own mood tag and BPM, not from listening to or measuring the audio — I can't
  hear it, and I'm saying so rather than presenting a guess as analysis.

---

## what I need from ISΛRK to actually start cutting

Nothing in this brief requires a response before I can hand it over — but production
itself cannot start without at least one of these:

1. **Raw footage or session material** — any of: studio/session clips, DAW-screen
   capture, performance footage, b-roll already shot, even phone footage. An internal
   edit needs something to edit. Right now there is nothing in the repo to cut.
2. **Direction preference, if any** — performance-style vs. abstract/visualizer-style vs.
   lyric-style static treatment. Default below assumes no footage exists and proposes
   the visualizer-class fallback used for Switch's W26 asset, since that path needs only
   audio + still art, not raw footage — but if ISΛRK has footage sitting somewhere
   (phone, hard drive, anywhere), that changes the whole approach and I'd rather know
   before building toward the no-footage default.
3. **Confirmation the master in `public/beats/audio/homerun.mp3` is the final mix** — the
   calendar says master is done; I'm treating that as true per the calendar but haven't
   independently verified it's the release-final file vs. a working version.

This is the same honesty standard as the Switch BTS clip and waveform render: I don't
fabricate footage to manufacture progress. If raw material never arrives, the fallback
path below (static-treatment / visualizer-class edit) is the one Nyx can actually execute
without anything further from ISΛRK except sign-off on direction.

---

## what I can do now, without any of the above

Plan the edit so that whichever raw-material answer comes back, execution starts same
day rather than waiting on a second round of scoping. Two paths, sized for what's likely:

### path A — footage exists somewhere
If ISΛRK has any usable clips: shot-list becomes an assembly edit — sync to the 140bpm
grid, cut on transient hits consistent with the "Hard / Trap" mood tag, keep it short
(113 sec source — a 60–90 sec cutdown is the realistic deliverable for socials, full
length for YouTube). I'd need the raw files before going further than this paragraph;
no point speccing shot lengths against footage that doesn't exist.

### path B — no footage, static/visualizer-class treatment (the realistic default)
Mirrors the Switch waveform-visualizer approach already signed off and in production for
W26 — this is the lower-risk, shorter-lead-time path the fallback decision was made
for in the first place:
- static cover-art frame (or a close variant) as base background
- waveform or simple frequency-reactive visualizer layer synced to the master audio
- minimal on-screen text: track title, artist credit, BPM/key card (optional, matches
  Switch's social copy style — sparse, factual, no embellishment)
- gradient treatment pulled directly from the catalog's own values for this track
  (`#FF7A55 → #3A0F18`) rather than inventing a new palette — keeps it visually
  consistent with the beat-store listing and dashboard card
- render length: full 113 sec for YouTube upload; no cutdown needed unless a shorter
  teaser is wanted for IG/X (decide closer to the date, not now)

Path B needs no raw material from ISΛRK beyond what already exists (`homerun.mp3`,
the gradient values, the cover art once produced) — this is the path I can execute
without further input if no footage surfaces. It is also the one that protects the
July 25 fallback date inside Homerun's own runway (edit must land by ~July 25 per the
calendar; slipping past Aug 1 pushes the release to Aug 22).

**I am not starting the actual render yet.** This brief states the plan; production
starts once ISΛRK confirms path A vs. B (or stays silent long enough that path B becomes
the practical default the same way the video-format decision did — but I'm not
pre-announcing a second silent-day fallback here, that's Hemera's mechanism, not mine to
invoke unilaterally).

---

## cover art status

Calendar says "art done." I haven't independently located a Homerun cover-art file in
the repo the way I located the audio master — flagging this as unverified, not assumed
true. If art is genuinely done, point me at the file; if it's only "done" in the sense of
existing somewhere outside the repo, that's also fine, just needs to land in
`team/drafts/uploads/homerun/` (or `public/`) before the upload package can reference it.

---

## what happens after raw-material answer lands

1. ISΛRK confirms path A (footage) or path B (static/visualizer) — or sends footage,
   which answers the question by itself
2. Nyx cuts the edit
3. Nyx builds the Homerun upload package (`team/drafts/uploads/homerun/`) — metadata,
   description, checklist, art-prompt — same structure as the Switch package already in
   review
4. Package queued for approval same as every other outward-facing deliverable

None of steps 2–4 start before step 1 resolves with real material. This brief is the
full extent of what's producible today without fabricating footage that doesn't exist.

---

*drafted by nyx · 2026-06-20 · in response to `t-homerun-video-decision` production
handoff (owner user → nyx, per Hemera's standup turn and the Q3 calendar's Homerun
section, both independently verified against `team/reports/q3-2026-release-calendar.md`
and `team/os/overlay.json` before acting). not queued for approval — production brief
only, no outward-facing content exists yet, same standard as the Switch waveform spec
and W27 collab-graphic spec.*
