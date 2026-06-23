# Switch — W26 content prep ("process" week, June 22–28)

for: X engagement post + SoundCloud preview-snippet packaging copy + waveform visualizer
spec sign-off
referenced in: `team/drafts/content/switch-prerelease-arc-w25-w28.md` (W26)
handoff: Hemera → Nyx, `t-switch-w26-content-prep`, 2026-06-18

---

## what this is

W25 ("signal") closes June 21; W26 ("process") opens June 22. Hemera handed this scope
today rather than leaving me idle against the blocked `t-switch-prerelease-arc` review
task. Three pieces, none of which need the hook-moment timestamp, the store URL, or the
publish time:

1. waveform visualizer asset spec — review and sign off as ready
2. W26 X engagement post — finished copy
3. SoundCloud 60-sec preview-snippet packaging copy — title, description, IG-story caption

What this is **not**: the BTS/DAW-session post and the waveform render's final cut. Both
still need user-supplied raw material (a session clip; an audio source to render the
visualizer against) per the arc doc's W26 assets-needed list. Not forcing either — flagged
below, same standard as W25.

---

## 1. waveform visualizer spec — sign-off

Reviewed `team/drafts/content/switch-w26-waveform-visualizer-prompt.md` against this
handoff. Verdict: **spec is finished and ready.** It already correctly states it doesn't
depend on the hook-moment timestamp, store URL, or publish time, and it already pulls the
right fallback background (`#A78BFA → #150A33`, confirmed against `src/data/beats.ts`'s
actual gradient for `switch` — matches exactly).

Nothing to add to the spec itself. What's still missing is downstream of the spec, not a
gap in it: an actual audio source to render the visualizer against. The spec already notes
this can be *any* sustained 15–30 sec section of Switch, not the hook moment specifically —
a temp mix or stem is enough. That source file does not exist yet in `team/inbox/audio/`
or `public/beats/audio/` beyond what's already cataloged.

**There is no approval-queue entry for this spec** — it's a production brief, not outward-
facing content. It only enters the approval queue once the rendered clip exists and has a
caption attached, same as the W27 collab-graphic spec sits today. Queuing the spec itself
would be queuing a to-do list, not content — flagging that distinction rather than padding
the approval queue with a non-decision.

**Status: spec finalized, queued for execution once a source clip lands. Not blocked on
anything Nyx can resolve — this is the same audio-export dependency as the BTS clip and
the SoundCloud snippet below.**

---

## 2. W26 X engagement post — finished copy

> `we made something for the ones who need 186 in the morning.`

This is the arc doc's own sketch, unchanged. Read it again against the rest of the arc's
voice and didn't find a stronger version — it already does the job: concrete BPM detail,
no link, no hashtag, present tense, talks to the actual listener (someone awake at 186 bpm
for a reason) rather than the track. Lowercase, no exclamation, no emoji. Matches W25's
register exactly.

**Posting notes:**
- no link, no hashtags — matches the rest of the arc's pre-store-URL discipline
- **post standalone.** There is no W25 marker post — the line `switch — ISΛRK ×
  10k.emraan. 186 bpm. c minor. july 18.` only ever existed as embedded planning copy in
  the arc doc, never independently drafted or queued as its own approval artifact
  (corrected 2026-06-23, per Hemera's 2026-06-22 fix to the arc doc and Argus's
  2026-06-22 audit, which flagged this file as one of two not yet updated to match).
  Standalone is the default, not a fallback.
- minor caveat, not a plan: if a thread-starting W25 post happens to exist and be
  published by the time this is scheduled, replying into it instead of posting standalone
  is a fine option — but nothing is being drafted to make that true, and don't wait on it
- does not reference 10k.emraan directly — W26 is "process" week, the solo-perspective
  beat; the collab voice is W27's job, not this post's

**What this needs vs. doesn't:**
- does not need: hook-moment timestamp, store URL, publish time, any audio asset, a
  thread to reply into
- needs (already in hand): BPM 186 — confirmed against `src/data/beats.ts`

---

## 3. SoundCloud 60-sec preview-snippet — packaging copy

Per the arc doc and the handoff: this is packaging text only. The actual 60-second MP3
export is on ISΛRK (`assets needed` list, W26 section) — not something Nyx can produce
without the final mix in hand. What follows is everything needed to post the snippet the
moment the export exists.

### snippet title
`Switch (preview)`

note: per the arc doc, this must be a **separate private SoundCloud track**, not the final
upload slot reserved for the July 18 release. Delete or re-private after the July 18 upload
goes live — carried over from the arc doc's existing instruction, repeating it here so it's
not missed at posting time.

### snippet description
> `Switch — ISΛRK × 10k.emraan. full record July 18.`

Short on purpose — this is a teaser link shared via IG story / X, not a standalone
SoundCloud listing meant to be discovered on its own. No tags, no license info, no link to
the store (store URL still outstanding regardless).

### IG-story share caption
> `60 seconds. july 18. link in bio.`

Matches the arc doc's existing line exactly — re-verified it against the W26 section,
no changes needed. Assumes "link in bio" resolves to the SoundCloud preview link once
posted; does not assume the beat-store URL (still outstanding, not used here).

### posting sequence (for whoever executes this once the export lands)
1. export 60-sec MP3 from the final mix (ISΛRK)
2. upload to SoundCloud as a new private track titled `Switch (preview)`, description above
3. grab the private share link
4. post IG story with the share link + caption above
5. cross-post the same link in the W26 X thread reply-chain if useful (optional, not in
   the arc doc's plan — flagging as an option, not adding it as a requirement)
6. after July 18 upload goes live: delete or re-private the preview track (per arc doc)

**What this needs vs. doesn't:**
- does not need: hook-moment timestamp, store URL, publish time
- still needs (blocking, on ISΛRK): the actual 60-sec audio export — cannot package a
  link to a file that doesn't exist yet. The copy above is ready the moment the export is.

---

## what's still genuinely blocked (not fabricated, not forced)

- **BTS/DAW-session post (W26 IG/TikTok #1):** needs a real session clip from ISΛRK. No
  placeholder footage exists or should be invented. Holding, per the handoff.
- **waveform visualizer final render (W26 IG/TikTok #2):** spec is done (see §1 above);
  the render itself needs a source audio file that isn't in the repo yet. Holding.
- **SoundCloud preview export:** copy is done (see §3); the actual MP3 is on ISΛRK.

None of these are Nyx-side gaps. Same standard as W25: flag, don't fabricate.

---

*the X post (§2) is finished, fact-checked copy ready for the approval queue. the
SoundCloud packaging copy (§3) is ready but has no file to attach to yet — queuing it now
would create an approval entry for content that can't be posted, so it's documented here
and will move to the queue once the export lands. the waveform spec (§1) is a production
brief, not outward-facing content, and does not get a queue entry on its own.*
