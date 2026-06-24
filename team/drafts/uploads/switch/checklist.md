# Switch — pre-upload checklist

target release: 2026-07-18
package drafted: 2026-06-12
approval due: 2026-06-20 (formal external gate — unchanged). June 17 input-deadline MISSED
with zero input from user as of 2026-06-18 — see sign-off note. Re-set to June 20 that day,
the existing approval-gate date, rather than inventing a new one.

**2026-06-19 update — buffer rebuilt, not just disclosed.** Argus flagged (t-switch-zero-
buffer-risk) that folding the input deadline into June 20 left zero days between inputs
landing and the gate closing, if they arrive on the gate date itself. Given a full
additional day of total silence since — no inputs, no approvals moved on anything — I am
not just accepting that risk in writing. I'm rebuilding the day: **June 19 (today) is now
the real internal marker for inputs to land.** June 20 stays the formal external gate
(unchanged, still the date that governs `ap-2026-06-19-switch-upload` and July 18 safety).
If the store URL and publish time arrive today, Nyx has a clear day to fold them into the
package before approval needs to close tomorrow. If they arrive on June 20 itself instead,
that zero-buffer risk is still live — this doesn't eliminate it, it just gives the inputs
a real shot at landing inside the buffer instead of past it.

---

## 1. audio file

- [ ] locate the final export: confirm file is at `public/beats/audio/switch.mp3` or the
      equivalent WAV master
- [ ] verify format: 320 kbps MP3 (upload copy) + lossless WAV (archival master)
- [ ] check levels: LUFS target –14 integrated for streaming platforms (SoundCloud / YouTube)
- [ ] confirm track is tagless (no producer tag baked into the upload file)

---

## 2. cover art / thumbnail

- [ ] produce cover art at 3000 × 3000 px (SoundCloud minimum: 1400 × 1400 px)
- [ ] produce YouTube thumbnail at 1280 × 720 px (16:9)
- [ ] see `art-prompt.md` for the visual direction
- [ ] export as JPG (cover) and PNG (thumbnail) — filename: `switch-cover.jpg`, `switch-thumb.png`

---

## 3. platform auth

- [ ] confirm SoundCloud account login is active at soundcloud.com/isark (or the live handle)
- [ ] confirm YouTube Studio access at studio.youtube.com
- [ ] if using a scheduler tool (e.g. Submittable, Distrokid, direct platform upload): verify auth tokens are valid

---

## 4. SoundCloud upload

- [ ] upload `switch.mp3` (or WAV if SC Pro allows)
- [ ] set title: `Switch`
- [ ] set artist: `ISΛRK × 10k.emraan`
- [ ] paste description from `description.md` (replace all `[TBD]` first)
- [ ] attach cover art (`switch-cover.jpg`)
- [ ] set genre: Hip-hop & Rap / Beats
- [ ] add tags from `metadata.json` (comma-separated in the tags field)
- [ ] set visibility: **private** until release day
- [ ] schedule publish for 2026-07-18 at [TBD — confirm time, suggest 12:00 UTC]
- [ ] enable direct download (optional — decide before upload)
- [ ] enable comments

---

## 5. YouTube upload

- [ ] upload the audio-visual file (static image + audio rendered as MP4, or a visualiser render)
      — if no video render exists, create a simple static-image MP4 using the cover art
- [ ] set title: `Switch - ISΛRK × 10k.emraan [Free Drill Type Beat 2026]`
      (title formula: Track — Artist [descriptor])
- [ ] paste description from `description.md` (replace all `[TBD]` first)
- [ ] attach thumbnail (`switch-thumb.png`)
- [ ] set category: Music
- [ ] add tags from `metadata.json`
- [ ] set playlist: Beats / Instrumentals (create if it doesn't exist)
- [ ] set visibility: **private** until release day
- [ ] schedule publish for 2026-07-18 — match SoundCloud publish time
- [ ] add end screen / cards to beat store link (set up in YouTube Studio after upload)
- [ ] enable monetisation if channel is eligible

---

## 6. beat store (site)

- [ ] confirm `switch` entry in `src/data/beats.ts` has the correct `soundcloudUrl` after
      SoundCloud upload completes (fill in the real URL before going live)
- [ ] confirm `audioFile` path resolves correctly in the dashboard preview
- [ ] test purchase flow end-to-end for the Switch listing

---

## 7. promo post queue

- [ ] approve captions in `captions.md` via the approval queue
- [ ] schedule Instagram post for 2026-07-18 (match release time)
- [ ] schedule YouTube community post for 2026-07-18 (match release time)
- [ ] optional: 2–3 day pre-release teaser post (2026-07-15/16) — tbd

---

## 8. final pre-publish check (day of release)

- [ ] confirm scheduled posts are queued correctly on all platforms
- [ ] spot-check the SoundCloud and YouTube URLs once live
- [ ] update `src/data/beats.ts` → add real `soundcloudUrl`
- [ ] update `team/library/beats.json` if the intake pipeline has run by then
- [ ] confirm no broken `[TBD]` placeholders are visible in any public-facing copy

---

## sign-off

drafted by: nyx · 2026-06-12
approved by: [TBD — user sign-off via queue ap-2026-06-19-switch-upload]

**2026-06-18 status: the June 17 input deadline passed with zero input.** Beat store
listing URL for Switch and the July 18 publish time are still both outstanding — same two
items as the last four standups. This checklist's `[TBD]` lines (rows 46, 64, 72) and the
approval package itself remain blocked on them.

**New hard date: June 20 (formal gate, unchanged).** This is not a new escalation — it is
the approval-gate date that was already on the calendar before the June 17 escalation
existed. If both inputs and the approval do not land by June 20, July 18 is no longer safe
without re-planning (per `q3-2026-release-calendar.md`: slip past June 27 and the date
moves to July 25). There is real runway left — this is not yet a crisis — but the next
miss is a date-moving event, not a re-ask.

**June 19 (today): real internal "inputs must land" marker, added 2026-06-19.** This is
the buffer fix for Argus's `t-switch-zero-buffer-risk` finding — collapsing the input
deadline into June 20 removed the day Nyx needs to fold real values into the package
before approval closes. Today is that day back. June 20 does not move.

**2026-06-20 status: the June 19 buffer marker passed with zero input.** Third
consecutive silent day (Jun 18, 19, 20). The zero-buffer risk Argus flagged on June 18
is no longer hypothetical — it is live. June 20 (today) is now simultaneously the
input deadline and the formal approval gate, exactly as warned, with no day in between
for Nyx to fold real values into the package even if inputs land later today.

**What happens now, stated plainly:**
- `ap-2026-06-19-switch-upload` stays `pending` in the queue. It is NOT auto-approved
  and NOT auto-rejected by today passing. Approval requires explicit user action
  regardless of date.
- The `[TBD]` placeholders (beat store URL, publish time — rows ~46/64/72 below and in
  `description.md`) stay `[TBD]`. No fabricated values are being inserted to force this
  through.
- No further internal buffer is being rebuilt a second time. Rebuilding June 19 once
  was the correct fix for a first occurrence. Doing it again tomorrow would be the
  date-juggling pattern Argus has already warned this team against — see the
  third-silent-day policy in `team/os/overlay.json` (note dated 2026-06-20) and the Q3
  calendar's "Next Check-in Points" section for what replaces ad hoc buffer-rebuilding
  going forward.
- July 18 safety math is unchanged in mechanics but tighter in practice: per the Q3
  calendar, the real deadline before July 18 needs re-planning is June 27. Today's miss
  does not move that date. It does mean there are now 7 days, not 8, of remaining
  runway, and zero of them are buffer anymore — every remaining day between now and
  June 27 is live runway, not slack.
- If inputs and approval have not landed by June 27, Switch moves to July 25. That is
  not a new threat; it is the same line that has been in this checklist and the
  calendar since June 16. Today's job is to say it is now 7 days away, not float it as
  abstract.

**2026-06-21 status: fourth consecutive silent day.** No movement on either input, no
movement on the approval. `ap-2026-06-19-switch-upload` is now 9 days old in the queue,
still `pending`. Updating the runway count to match the calendar: June 27 is now **6
days, not 7**, away — the line above was last touched 2026-06-20 and had drifted one day
stale against `q3-2026-release-calendar.md`'s same count. Same wall, same mechanics,
just keeping this file's number honest day to day rather than letting it quietly lag the
calendar's.

**2026-06-24 status: seventh consecutive silent day.** Still no movement on either
input, no movement on approval. `ap-2026-06-19-switch-upload` is now 12 days old in the
queue. June 27 is now **3 days, not 4**, away — this line had drifted stale again (last
touched June 21) and is corrected here to match the calendar. Per the calendar's new
standing-policy clause (part 5, added today), June 26 is now the named final-day
checkpoint before the wall — not a new date, a sharper tone on approach to the existing
one.
