# Q3 2026 Release Calendar — ISΛRK
_Drafted by Hemera · 2026-06-12 · Based on catalog snapshot at kickoff_

---

## Overview

Four tracks in the pipeline for Q3 (July–September 2026). Only one (Switch) is
release-ready. The others have defined blockers that must close before a date can be
locked. Dates below are targets; they shift if blockers slip.

---

## Track-by-Track

### 1. Switch
**Target: July 18, 2026**
Status: export done, upload scheduled.
This is the most ready asset. Upload package is being built now (Nyx). No known
creative blocker. The gap between now and July 18 gives six weeks for the upload,
thumbnail/art review, caption copy, and a short promo window (one week minimum before
release). This is the anchor release of Q3.

Blockers: none creative. Operational: upload package must be approved, then the
SoundCloud/YouTube upload must execute and return a scheduled-publish link. Two
required inputs from the user — beat store listing URL and the July 18 publish time —
were escalated from June 18 to **June 17** on 2026-06-16, for buffer before the
approval gate. **That June 17 deadline passed on 2026-06-18 with zero input received.**
Re-set on 2026-06-18 to **June 20** — not a new escalation, but the pre-existing
approval-gate date, now carrying both jobs (inputs + approval) since splitting them
produced no extra urgency, only an extra date to track. If those inputs and the
approval land by June 20, July 18 is safe. If it slips past June 27, push to July 25.

**2026-06-19 — buffer rebuilt, not just disclosed.** Argus flagged (`t-switch-zero-
buffer-risk`) that collapsing the two dates into one left zero days between inputs
arriving and the gate closing, if both land on June 20 itself. A full additional day of
total silence followed with no movement on anything. Decision: rebuild the day rather
than just write the risk down. **June 19 (today) is now the real internal marker for
inputs to land; June 20 stays the formal external gate, unchanged.** If inputs arrive
today, Nyx has a clear day to fold them in before tomorrow's gate. If they arrive on
June 20 itself anyway, the zero-buffer risk is still live by definition — this gives the
inputs a real shot at landing inside a buffer instead of guaranteeing they land past one.

**2026-06-20 — the risk landed for real.** The June 19 marker passed with zero input,
third consecutive silent day. June 20 (today) now carries both jobs — input deadline
and formal approval gate — exactly as Argus warned, with no buffer day between them.
`ap-2026-06-19-switch-upload` remains `pending`; nothing is auto-approved by the date
passing. The mechanical deadline that actually protects July 18 is still **June 27**
(unchanged, set June 16) — today's miss does not move it, but it does mean every day
from here to June 27 is live runway, not slack, since the one buffer day available has
now been used without result. No second buffer-rebuild is planned; see the standing
silent-day policy below and in `team/os/overlay.json` for what happens instead if
silence continues.

Pre-release tasks:
- Nyx: build upload package (done, in review — blocked only on the two user inputs below)
- User: provide beat store URL + publish time — internal target **June 19 (today)**,
  formal gate **June 20** — then approve package
- Nyx: queue SoundCloud upload for scheduling

---

### 2. Homerun
**Target: August 8, 2026**
Status: art + master done. Video path **decided by default 2026-06-20** — internal
edit. See decision note below.

**2026-06-20 — fallback now in effect.** The pre-announced checkpoint was today's
standup. Three consecutive silent days (Jun 18, 19, 20) with zero user input on this
decision. Per the rule Hemera set on 2026-06-18 and restated on 2026-06-19 — "if
silence continues past today's EOD, tomorrow's standup becomes the real checkpoint and
the fallback will be treated as in effect unless told otherwise before then" — the
fallback is now in effect: **default to the internal edit over a commissioned video.**
This is reversible. If the user surfaces a preference for a commissioned video before
production starts on the internal edit, that instruction overrides this default — no
sunk cost is being protected here, the internal edit is chosen for shorter lead time
and lower risk to the Aug 8 date, not because it is irreversible. Task-board status
change needed: `t-homerun-video-decision` moves from `blocked` to `done` (or `doing`,
Hemera defers exact status word to Mnemosyne's consolidation), owner changes from
`user` to `nyx`, decision recorded as "internal edit, by default per pre-announced
fallback, reversible until production starts."

Homerun is ready except for the video asset itself, which Nyx now owns producing.
Three weeks after Switch gives each release its own promotional moment. August 8 lands
on a Saturday, which tends to perform well for melodic/electronic releases (audience is
online, editorial playlists often update Friday–Saturday).

**2026-06-21 — production-start trigger defined (`t-homerun-production-start-definition`,
resolved).** Argus flagged on 2026-06-20 that "reversible until Nyx starts production"
had no concrete, falsifiable trigger — left undefined, the reversibility window could
quietly narrow later without anyone deciding that on purpose. Confirmed first, not
assumed: zero footage, zero session clips, zero render exist anywhere in the repo as of
today (re-checked; zero commits since the 2026-06-20 meeting closed means Nyx's
2026-06-20 brief — `team/drafts/content/homerun-internal-edit-brief.md` — is still
accurate word for word). The trigger, concrete and falsifiable: **production starts the
moment any of the following exists in the repo** — (a) a render or export file for the
Homerun internal edit (any format, any length, draft or final) under
`team/drafts/uploads/homerun/` or elsewhere in the repo, (b) a committed edit-decision
artifact (e.g. an edit list, timeline file, or project file) that fixes path A vs. path B
and locks specific cuts/timings rather than describing options, or (c) Nyx's task status
on `t-homerun-video-decision` (or a successor task) moving from `doing` to `review` with
a linked deliverable. Path A vs. B selection alone, or further brief-writing, does NOT
count — Nyx's brief explicitly scopes both paths without committing to either, and that
scoping work is pre-production, not production. Until one of (a)–(c) is true, ISΛRK
stating a commissioned-video preference still overrides the internal-edit default with
zero sunk cost. This is the answer to the open question Argus raised; it is not a new
deadline or new pressure on Nyx — she has not started, and nothing here asks her to
start before raw material or a direction call exists.

Blockers:
- Internal edit must be produced and delivered before approximately July 25 to allow
  time for upload, review, and scheduling.
- If the edit slips past August 1, the release moves to August 22.

Pre-release tasks:
- Nyx: produce the internal edit (handoff effective 2026-06-20)
- Nyx: build upload package once the edit is delivered
- Hemera: re-confirm date once edit ETA is known (by July 1 check-in)

---

### 3. Virtual Love
**Target: September 5, 2026**
Status: demo, needs chorus.
This track is not release-ready. The chorus gap is a creative blocker — nothing else
can progress until the song is structurally complete. Target is provisional and
assumes the chorus is finished and a mix is delivered by August 1. That gives five
weeks for mix approval, master, art, upload package, and promo.

If the chorus is not done by August 1, the track moves to Q4.

Blockers:
- Chorus completion (user/artist)
- Mix after chorus
- Master after mix
- Art (none confirmed yet)

Pre-release tasks:
- User: deliver chorus and flag Aether for mix review when ready
- Aether: flag Hemera when master is received
- Nyx: hold on content until master is confirmed

---

### 4. Nightshade
**Status: DROPPED from Q3 — moved to Q4 carry-over. Decided 2026-06-22.**

**2026-06-22 — fallback executed, as pre-announced.** This decision was flagged on
2026-06-15 (`t-nightshade-eta-decision`, due 2026-06-22) and restated without new
pressure on 2026-06-18 and 2026-06-21: "if no re-mix ETA surfaces by June 22, drop
Nightshade from Q3 and treat as Q4 carry-over." Today is June 22. Verified directly
before acting, not assumed: `cursors.json` is still all-empty (`discord: {}`,
`imap.lastUid: 0`, `copyparty.seenShas: []`), `tasks.json` shows zero movement on
`t-nightshade-eta-decision` since it was filed, and the only commit since the
2026-06-21 meeting closed is that meeting's own commit. Fifth consecutive silent day
(Jun 18–22), zero re-mix ETA surfaced. The pre-announced condition is met exactly as
stated — not early, not stretched. **Nightshade is removed from the Q3 release
calendar and treated as a Q4 carry-over with no fixed date.** No re-mix has been
reported lost or abandoned — this is a scheduling decision, not a creative one. If a
re-mix ETA surfaces at any point, Nightshade re-enters the calendar at the next
available slot; nothing about today's decision forecloses that.

**Why this is a date-moving event for a real release, not an internal housekeeping
note.** Per the standing third-silent-day policy below, anything where a previously
pre-announced fallback takes effect escalates to ISΛRK directly — same bar Homerun's
internal-edit default crossed on 2026-06-20. This is the second time that bar has been
crossed. Treating it as a quiet calendar edit would be inconsistent with how Homerun
was handled two days ago, and inconsistency in which silences get escalated is its
own failure mode. Argus's channel carries this to ISΛRK directly this run.

**Reversibility, stated plainly.** This is reversible in substance — a re-mix ETA at
any future point puts Nightshade back on a calendar, just not this quarter's. It is
not reversible in the sense of "Q3 still has a fourth track" — that slot is gone for
this quarter regardless of what happens next, because there is no realistic path back
to a Sep 26 (or earlier) release from a standing start today. Naming that distinction
so it isn't read as fully undone-able when it isn't.

Blockers (now Q4, not Q3):
- Re-mix completion — still no ETA
- Master
- Art (status unknown)

Pre-release tasks (deferred, not active):
- Aether: check in on re-mix status once Nightshade enters the intake pipeline (still
  structurally blocked on Discord intake setup, `t-intake-channels`)
- Hemera: re-open a Q4 slot once a re-mix ETA actually surfaces — no speculative date
  set today

---

## Summary Table

**Q3 is now a 3-track quarter (Nightshade dropped to Q4 carry-over, 2026-06-22 — see
Nightshade section above).**

| Track        | Target Date    | Status                  | Hard Blocker               |
|--------------|----------------|-------------------------|----------------------------|
| Switch       | July 18        | Ready for upload        | None creative              |
| Homerun      | August 8       | Art + master done       | Video                      |
| Virtual Love | September 5    | Demo                    | Chorus, then mix + master  |
| ~~Nightshade~~ | ~~September 26~~ | **Q4 carry-over** | Re-mix has no ETA — moved off Q3 board |

---

## Release Spacing

- Switch → Homerun: 21 days. Sufficient for individual promo cycles.
- Homerun → Virtual Love: 28 days. Good gap.
- Virtual Love → end of Q3 (Sep 30): 25 days of open runway with no scheduled release
  behind it. **This line is new as of 2026-06-22** — dropping Nightshade removes the
  back-half anchor this spacing used to be measured against. Re-spacing call, made
  explicitly rather than left implicit: this open runway is not a gap to fill
  reflexively. It is genuine slack for Virtual Love to slip into if the chorus runs
  long (its Sep 5 target already carries its own Q4 contingency if the chorus isn't
  done by Aug 1), and it is also room for Nightshade to return to *if* a re-mix ETA
  surfaces inside Q3 after all — re-entering this quarter is still possible, just no
  longer assumed or held open by default. No new track is being scheduled into this
  space speculatively.

---

## Q3 Risks

1. Virtual Love chorus is unknown timeline — this is the most likely track to slip,
   and is now also the only thing standing between Q3 ending with three releases or
   two.
2. ~~Nightshade re-mix has no ETA — treat as Q4 until there is a completion date.~~
   Resolved 2026-06-22: dropped from Q3, treated as Q4 carry-over per the standing
   pre-announced fallback. No longer an open risk on this quarter's board.
3. ~~No video production pipeline is confirmed for Homerun.~~ Resolved 2026-06-20 by
   default fallback: internal edit. Now an execution risk (Nyx delivery timeline), not
   a decision risk.
4. No Discord intake is live yet (channel IDs outstanding). Aether cannot receive new
   demos until that is resolved. This also still structurally blocks any future
   Nightshade re-mix from entering the pipeline even if an ETA does surface.
5. Switch's one rebuilt buffer day (June 19) passed with no input — see "Standing
   policy: third consecutive silent day" below. July 18 now depends on inputs landing
   inside the June 20–27 window with no slack day banked. June 27 is **5 days out**
   as of today, 2026-06-22.

---

## Standing policy: third consecutive silent day (added 2026-06-20)

Filed in response to `t-backlog-collision-risk-0619`. Two prior silent days (Jun 18,
19) were each handled case-by-case — disclosing a risk, then rebuilding a buffer day.
A third consecutive silent day (today, Jun 20) means case-by-case patching is no longer
the right response; it produces a new ad hoc fix every day, which is its own failure
mode. This section is the durable answer, not a one-off note.

**1. Reminder cadence does not increase.** More reminders into silence have not worked
for three days running and add noise, not signal. Reminders stay at their current
daily standup cadence (overlay notes + reminders, restated with current numbers, not
re-escalated tone).

**2. Escalation split — what goes to ISΛRK directly vs. stays internal:**
- **Escalates to ISΛRK directly (Argus's channel, not buried in a Hemera note):**
  any item where a previously-stated fallback is about to take effect or has taken
  effect (e.g. today's Homerun default), and any item where the next miss is a
  date-moving event for a real release (e.g. Switch past June 27 → July 25).
- **Stays internal, handled by the team without a fresh escalation:** small open
  decisions with no fixed deadline consequence (W25 cadence call, Nightshade ETA before
  its own June 22 flag date) — these get tripwires (see `t-w25-cadence-decision-
  tripwire`), not repeated escalation language.

**3. Colliding deadlines get deliberately re-spaced, not independently patched.**
Going forward, when a silent day causes two or more deadlines to fall within 48 hours
of each other (as happened Jun 19–20 with the Homerun checkpoint and the Switch gate),
Hemera re-spaces them explicitly in this calendar and says so in the same standup turn,
rather than letting each one separately invent its own buffer day. This calendar's
"Next Check-in Points" section below is the single source of truth for re-spaced dates;
overlay notes and checklists reference it rather than carrying competing dates.

**4. No further buffer-rebuilding by default.** June 19 was the one buffer day this
team rebuilds for the Switch gate. It is spent. The next miss is a date-moving event
(July 25), not another internal marker. This is stated here so it is a standing rule,
not a per-incident judgment call.

---

## Next Check-in Points

- ~~June 17: Switch inputs due from user~~ — **missed, zero input received.** Folded
  into the June 20 date below rather than re-escalated a third time.
- ~~June 19: Homerun video-path decision due~~ — **missed, zero input received.**
  **Resolved 2026-06-20: fallback now in effect — internal edit, by default, per the
  pre-announced rule.** Reversible if the user states a preference before Nyx starts
  production. See Homerun section above.
- ~~June 19: real internal marker for Switch inputs to land~~ — **missed, zero input
  received.** Buffer day spent with no result; not being rebuilt a second time — see
  the standing third-silent-day policy above.
- **June 20 (today): Switch — package approval, formal external gate.** Unchanged,
  still open, still `pending` in the approvals queue. No further buffer beyond this
  without re-planning the July 18 date. The date that actually protects July 18 is
  June 27 (next line).
- **June 27: hard line for Switch inputs + approval before July 18 needs re-planning.**
  If unmet, the release moves to July 25 — not a new threat, the same line set June 16,
  now **5 days out** as of today, 2026-06-22 (was 6 days out as of June 21).
- ~~June 22: Nightshade re-mix ETA decision due.~~ **Resolved 2026-06-22: no ETA
  surfaced, fallback executed — Nightshade dropped from Q3, Q4 carry-over.** See
  Nightshade section above. This is the second pre-announced fallback to take effect
  (after Homerun on June 20) and is being escalated to ISΛRK directly via Argus's
  channel this run, per the standing policy's own escalation-split rule.

**2026-06-21 — fourth consecutive silent day, policy held, nothing new escalates.**
Jun 18, 19, 20, and now 21 have passed with zero commits and zero user input —
confirmed against `git log` (one commit since the 06-20 meeting closed, the meeting
commit itself) and `team/state/cursors.json` (still genuinely empty). Checked today's
facts against the standing third-silent-day policy above, item by item, on purpose:
Homerun's fallback already activated on June 20 — that is old news being correctly
*not* re-escalated today, not a fresh trigger. The approvals queue's three items are
now 9, 4, and 3 days old respectively (`ap-2026-06-19-switch-upload`,
`ap-2026-06-17-switch-w25-collab-story`, `ap-2026-06-18-switch-w26-x-post`) — aging, but
aging is not itself a date-moving event; the actual date-moving line is June 27, still
6 days off. Nothing today crosses the policy's own escalation bar (a fallback newly
taking effect, or a miss that moves a real release date). So: no new escalation to
ISΛRK today. This is the policy working as designed on a second consecutive day, not
the policy lapsing — silence alone does not manufacture urgency where the calendar math
says there isn't any yet.

**2026-06-22 — fifth consecutive silent day, second fallback executed.** Jun 18
through 22, five days, zero commits and zero user input — confirmed the same way as
every prior day: `cursors.json` still all-empty, `tasks.json` shows no movement,
single commit since the prior meeting is that meeting's own. Today is the date
`t-nightshade-eta-decision` was due. No re-mix ETA surfaced. Per the pre-announced
rule stated on 2026-06-15 and restated without new pressure on 2026-06-18 and
2026-06-21, the fallback executes today: **Nightshade drops from Q3, moves to Q4
carry-over.** This crosses the standing policy's own escalation bar (a pre-announced
fallback taking effect) exactly the way Homerun's did on June 20 — escalated to
ISΛRK directly via Argus's channel this run, not just noted here. Switch's June 27
wall is now 5 days out; still not crossed, correctly not escalated on its own today.
Release spacing re-spaced explicitly above (Virtual Love → end of Q3 is now open
runway, not anchored to a Nightshade date) rather than left as a stale three-month-old
assumption now that the fourth track is gone.
- July 1: Virtual Love chorus status check.
- August 1: Virtual Love mix received or track moves to Q4.

---

_This calendar is a working draft. Dates are proposals, not announcements. Nothing
here is outward-facing until the relevant upload package is approved and published._
