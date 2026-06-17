# Switch — pre-upload checklist

target release: 2026-07-18
package drafted: 2026-06-12
approval due: 2026-06-17 (escalated from 2026-06-20 on 2026-06-16 for buffer — see sign-off note)

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

**Outstanding from user, due 2026-06-17 (today):** beat store listing URL for Switch,
July 18 publish time. Both block finishing this checklist's `[TBD]` lines (rows 46, 64,
72) and the approval package itself. Escalated by Hemera 2026-06-16.
