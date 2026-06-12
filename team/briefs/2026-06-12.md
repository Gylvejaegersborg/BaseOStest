# Daily brief — 2026-06-12

**TL;DR:** First real standup complete. Q3 calendar drafted, Switch upload package ready for your review. The approval round-trip is proven. Two setup gaps still keep intake dark.

---

## Needs you

1. **Approve the Switch upload package** (`ap-2026-06-19-switch-upload`) — review the draft at `team/drafts/uploads/switch/`. Target: approve by June 20 so the July 18 release date holds. Two open fields in the package: live beat store URL for Switch, and preferred publish time on July 18 (Nyx suggests 12:00 UTC).

2. **DISCORD_BOT_TOKEN secret + DISCORD_INTAKE_CHANNELS variable** — Aether and Hermes receive nothing until these are set. Repo → Settings → Secrets/Variables → Actions.

3. **IMAP credentials** — Hermes cannot see booking or collab mail without them.

4. **Homerun video decision by July 1** — internal edit or commissioned? August 8 release depends on it. If no decision by July 1, the date slips to August 22.

---

## State of play

**Catalog / Q3 calendar** (`team/reports/q3-2026-release-calendar.md`):

| Track | Target | Status | Blocker |
|---|---|---|---|
| Switch | Jul 18 | Upload package queued | Your approval |
| Homerun | Aug 8 | Art + master done | Video |
| Virtual Love | Sep 5 (conditional) | Demo | Chorus, then mix + master |
| Nightshade | Sep 26 (tentative) | Re-mix in progress | Re-mix ETA unknown |

**Task board:**
- `t-switch-upload-package` — review (Nyx done, pending your approval)
- `t-intake-channels` — backlog (blocked on you)
- `t-secrets-setup` — done (token confirmed working)
- `t-release-calendar` — done (calendar written today)

**Approvals queue:** 1 pending — `ap-2026-06-19-switch-upload` (Switch upload package)

---

## What the team does next

- **You approve Switch** → Nyx queues the SoundCloud/YouTube upload for July 18.
- **You set Discord channel IDs** → intake goes live, Aether starts receiving beats.
- **June 20:** Hemera checks Switch approval status; re-plans if slipped.
- **July 1:** Hemera check-in — Homerun video ETA + Virtual Love chorus status.
