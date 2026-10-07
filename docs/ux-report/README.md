# BaseSpace usability report

A working list of things to fix, with evidence, so we can go through it over time. Only problems are listed.

- **First pass:** 2026-10-08, by Claude, in a real Chrome (headless) against the live server, at desktop 1440×900 and phone 390×844.
- **Read-only:** I opened every page and every Workbench tab and opened one flow. I did not complete, send, approve, delete or upload anything.
- **How to use this file:** each issue has an ID. Change **Status** as we go (`open` → `doing` → `done`, or `dropped` with a reason). Add new issues at the end of their section.

**Severity:** High = misleads you or blocks a core job · Med = slows you down or confuses · Low = polish.
**Certainty:** *Confirmed* = I saw it (and checked the code where noted) · *Likely* = fits what I saw, not fully verified · *Uncertain* = needs your answer, flagged under "Questions for you".

## The short list (what I'd fix first)

1. **T1** The Ops page shows invented data as live status.
2. **C1** Nothing tells you when something needs you.
3. **C2** In a flow, the decisions are buried at the bottom, under developer stats.
4. **C3** Markdown shows as raw `**stars**` in the verdict, agent reports and chat.
5. **P1** On the phone the Flow panel is see-through, so the chat shows through the text.
6. **C4** The Files, Artifacts and Events tabs don't show what agents actually produced.
7. **T2/T3** Lab, Calendar, Projects and Notes mix sample data in with your real work.
8. **L1/L2** The flow panel is too busy: stats up front, nested scroll boxes, an answer box on every todo.

---

## 1. Trust: things that look real but aren't

| ID | Sev | Cert. | Status |
|---|---|---|---|
| T1 | High | Confirmed | open |

**T1. The Ops page is made-up data presented as live.** *Screen: `/ops` ([ops.webp](shots/ops.webp)).*
Services (homeserver, copyparty, artist-web, vault-api, beat-db, discord-bridge) with latency and uptime charts, devices (iPhone, Studio Mac, NAS, Pi-monitor with 192.168.1.x addresses), a "live log" (`tail -f /var/log/basespace` with every line stamped the same second), and errors such as "Import failed: unsupported sample rate 96kHz" and "Master complete: track_0427". It all comes from `src/data/ops.ts`, and the log label is hard-coded in `src/pages/Ops.tsx`. The project's own rule is to never invent facts or metrics.
*Fix:* show only what is real (gateway, Hindsight, supervisor, connectors, agents, recent gateway errors, disk and log sizes), or remove the page until it is. *Not sure:* the "Agent health" token numbers look real; I did not check where they come from.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| T2 | High | Confirmed (statuses) / Uncertain (which apps exist) | open |

**T2. Lab shows hard-coded "LIVE / STAGING / LOCAL" badges, empty preview boxes and a fake console.** *Screen: `/lab` ([lab.webp](shots/lab.webp)).*
Statuses are typed into `src/data/labs.ts`. The previews are grey placeholders ("PREVIEW · STOREFRONT"). The Test console says "connected to beat-store" and offers Ping / Build / Deploy. I could not tell which of these apps exist.
*Fix:* derive status from something real (is it reachable?) or drop the badge; remove the console or make it do something real.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| T3 | Med | Likely | open |

**T3. Sample items are mixed into your real lists.** *Screens: Calendar ([calendar.webp](shots/calendar.webp)), Projects, Notes.*
Calendar has "Gym", "Renew domain artist.app", "Reply to sync licensing email", "Master new single". Projects has "Copyparty Server", "Homeserver Setup", "iOS Shortcuts Bridge". The vault notes ("Welcome", "Formatting"…) show invented "5m ago / 40m ago" times. They sit in the same lists as the real Salient todos, so "2/33 done · 6%" means nothing. These come from `src/data/calendar.ts`, `projects.ts` and `notes.ts`.
*Fix:* a "sample data" switch (off by default) or a one-time clear, and keep real items visually separate until then. See Questions for you.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| T4 | Low | Confirmed | open |

**T4. "Demo Agent" is in the team and counted as online.** It is listed under "Other" with the text "A minimal demo agent for agent-os", and the top bar says "9 agents online". *Fix:* hide demo and test agents from the roster and the count.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| T5 | Med | Uncertain | open |

**T5. The Crons tab lists six jobs with recent "last run" times.** *Screen: Workbench → Crons.* Three of them (every 2h / 6h / 15m: upload queue flush, beat import scan, sub-agent health check) sound like sample data, yet they show "14m ago" and "6m ago". If they are real they should have left traces; if not, they mislead. *Fix:* check which crons are real, and only show real ones.

---

## 2. Continuity: knowing what needs you, and finding what agents produced

| ID | Sev | Cert. | Status |
|---|---|---|---|
| C1 | High | Confirmed | open |

**C1. Nothing says "something needs you".** No count or dot on the Flow, Approvals or Tasks tabs, none in the top bar, none on the home screen. Today the nine open Salient decisions are only found by opening Workbench → Flow → a specific flow → scrolling about 1,500 px ([flow-todos.webp](shots/flow-todos.webp)). *Fix:* one "Needs you" place with a badge in the top bar and a card on the home screen: pending approvals, open decisions from flows (with their options), failures, flows that finished with a briefing.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| C2 | High | Confirmed | open |

**C2. The order of a flow's page is backwards.** *Screen: Flow tab ([flow-top.webp](shots/flow-top.webp), [flow-todos.webp](shots/flow-todos.webp)).* From the top: the flow description, developer stats, Argus' old verdict (clipped in its own scroll box), then Briefing, Results, the agent cards, and only then "Still to do". It should be: Briefing → what you need to decide → what agents did → details. Also, the verdict at the top is the old first check, while newer reviews live in other flows. *Fix:* reorder, and show the latest verdict with its date.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| C3 | High | Confirmed | open |

**C3. Markdown is not rendered in three places.** Argus' verdict shows literal `**Result: 12 problems found.**` ([flow-top.webp](shots/flow-top.webp)); each agent's quoted report shows `**What went in:**`; Hemera's chat shows `*Last updated: 2026-10-06*` ([chat-with-flow.webp](shots/chat-with-flow.webp)). *Fix:* render markdown there (the app already ships `react-markdown`).

| ID | Sev | Cert. | Status |
|---|---|---|---|
| C4 | Med | Confirmed | open |

**C4. Files, Artifacts and Events don't show what agents actually make.** *Screens: [tab-files.webp](shots/tab-files.webp), [tab-events.webp](shots/tab-events.webp).*
- **Files** only lists file edits/undo ("No file changes recorded yet.").
- **Artifacts** only lists outputs agents register with one tool.
- **Events** only shows events since the page was opened ("No events yet." while agents have been busy for days).
- The things agents really produce (notes, todos) are in none of them. The Notes tab is a flat list that starts with the sample "Welcome / Formatting / Guides" notes, not the agents' notes.

*Fix:* one "Output" feed (agent notes, todos, artifacts, file changes) by time, with the flow each came from, and let Events load recent history. At minimum rename the tabs to what they hold.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| C5 | Med | Confirmed | open |

**C5. The Tasks tab is a wall of identical rows with stale alerts.** *Screen: [tab-tasks.webp](shots/tab-tasks.webp).* "Runs" lists dozens of "flow-step argus SUCCEEDED" lines with no flow name, step, time or result. Two purple "needs you" items (Theia's reopened note, a usage-limit failure) sit at the top although they are long handled, under a heading that says "WORK · 0 ACTIVE". *Fix:* show flow, step, time and duration, link each run to its flow report, and let me dismiss or auto-clear handled escalations.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| C6 | Med | Confirmed | open |

**C6. An agent's thread opens on harness text, not a conversation.** *Screen: [chat-with-flow.webp](shots/chat-with-flow.webp).* Hemera's thread is titled with a work brief ("Work: Fix FAQ…") and contains the full instruction text written for the model ("Work · Hemera handed you this (work item …)", hand-back notes, "Do it now…"). *Fix:* collapse harness and work briefs into one line ("Work item: Fix FAQ 'register' ambiguity · done") with "show full".

| ID | Sev | Cert. | Status |
|---|---|---|---|
| C7 | Med | Likely | open |

**C7. The main effort has no goal.** Projects says "GOALS · 0 active — No goals yet" while the Salient launch is the main work. Flows then say they aren't tied to a goal and agents don't get the goal chain. Nothing nudges you to create one. *Fix:* offer "create a goal for this" from a flow or its briefing.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| C8 | Low | Uncertain | open |

**C8. Todo details are only readable in the flow panel.** In the Calendar's todo list the Salient titles are cut ("License: fill [your legal name …") and I did not find a way to open the details or answer there. I did not click into them, so this may exist. *Fix:* the todo detail (details, referenced notes, answer) should open from anywhere the todo appears.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| C9 | Low | Likely | open |

**C9. Todos can go stale when the notes they point to change.** The "Cover art" todo still says "Reference concept in BeatStars listing draft: layered geometric shapes…", a concept that is no longer in that note. Todos are written once and never revisited. The briefing's "Out of date or contradictory" section is meant to catch this, but only when it is run. *Fix:* show the age of a todo and when the note it references last changed.

---

## 3. Layout: busy panels and sides

| ID | Sev | Cert. | Status |
|---|---|---|---|
| L1 | Med | Confirmed | open |

**L1. The flow panel is too busy.** *Screen: [flow-top.webp](shots/flow-top.webp).*
- A developer line sits at the top: "56 tool calls · 25 added to BaseSpace · 462k in / 87k out tokens · 14m 11s of agent time". "25 added" disagrees with Results below ("8 notes · 10 todos"), because it counts every re-save.
- I counted **11 nested scroll areas** inside the one panel (the verdict box, and every expanded note preview has its own). Scrolling gets trapped.
- The red-bordered "Briefing: Not written yet" box looks like an error.

*Fix:* cost and counts behind a "details" toggle with one consistent set of numbers; expand notes inline without inner scroll (or open them in a side drawer); a calmer style for the briefing box. An explicit "Write briefing" is also needed for flows that finished before briefings existed.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| L2 | Med | Confirmed | open |

**L2. Every todo gets an answer box, and all are "HIGH".** *Screen: [flow-todos.webp](shots/flow-todos.webp).* Nine identical rows: text, details, "Read: …", an input and Done. Upload, record-the-video and legal review don't need a typed answer; "Final pack name" would be better as buttons for its options. All nine are marked HIGH, so priority tells you nothing. *Fix:* an input only for questions, a plain checkbox for actions, options as buttons when the todo lists them; group as "decide / do / later".

| ID | Sev | Cert. | Status |
|---|---|---|---|
| L3 | Med | Confirmed | open |

**L3. 50/50 makes the chat narrow, and an empty half is wasted.** *Screen: [chat-with-flow.webp](shots/chat-with-flow.webp).* Chat bubbles use about 330 px of a 500 px pane, in large type, so long agent replies become tall narrow columns. With no agent selected the left half is just "Pick an agent on the left to open a conversation." while the panel takes the other half. *Fix:* bubbles use the full pane width; with no agent selected, give the panel more room or show "Needs you" there instead.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| L4 | Med | Confirmed | open |

**L4. Eleven equal tabs, several empty.** Tasks, Flow, Artifacts, Approvals, Events, Memory, Files, Notes, Crons, Teams, Terminal, plus Settings, all the same weight. Memory says "Select an agent to see what it's learned." and Events is empty until you pick one. *Fix:* group them (Work · Output · System), show counts, and hide or disable tabs that have nothing.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| L5 | Low | Uncertain | open |

**L5. Unlabelled coloured dots in the agent rail.** Orange, pink and green dots beside each agent (Argus has two) with no legend. There may be a tooltip I didn't hover. *Fix:* label them, or say what they mean on hover and in a legend.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| L6 | Low | Uncertain | open |

**L6. A lot of very small, low-contrast text.** Dim grey monospace at roughly 10–11 px carries a lot of important information (flow details, task rows, ops), and is hard to read on the phone. Possibly intentional styling. *Fix:* raise the size and contrast of anything you have to read to decide something.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| L7 | Low | Confirmed | open |

**L7. Timeline strip labels collide.** *Screens: [phone-home.webp](shots/phone-home.webp), desktop home.* On the phone "Daily content plan" overlaps "Agent standup"; on desktop "Approve cover art for si…" is cut off.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| L8 | Low | Confirmed | open |

**L8. Calendar week view is dominated by repeated cron rows.** The dashed "Vault backup" and "Daily content plan" rows repeat across all seven days and many titles are truncated ([calendar.webp](shots/calendar.webp)). *Fix:* collapse crons into one band, or off by default.

---

## 4. Phone

| ID | Sev | Cert. | Status |
|---|---|---|---|
| P1 | High | Confirmed | open |

**P1. Panels are see-through on the phone.** *Screen: [phone-flow.webp](shots/phone-flow.webp).* The Flow panel opens as a bottom sheet with a transparent background, so the conversation text shows through behind it and both become hard to read. *Fix:* an opaque sheet with a dimmed backdrop.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| P2 | Med | Confirmed | open |

**P2. The Flow header wraps badly and the first Workbench screen wastes space.** In the sheet, "← All flows", the title, the id and "SUCCEEDED" break across lines. The first Workbench screen is the agent list in about two-thirds of the width beside an empty area ([phone-workbench.webp](shots/phone-workbench.webp)), and the tabs hide behind a "Panels" button.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| P3 | Low | Confirmed | open |

**P3. Sound Lab has no way out.** *Screen: [sound-lab.webp](shots/sound-lab.webp).* It is outside the app shell and has no link or button back to the OS (I found no links on the page). You must use the browser's Back. On desktop it is also a narrow column in a mostly empty screen (fine for swiping, but the empty space has no use).

---

## 5. Performance and technical

| ID | Sev | Cert. | Status |
|---|---|---|---|
| X1 | Med | Uncertain | open |

**X1. Every page load fetches about 176 files.** Roughly 3.7 MB (phone, simulated 10 Mbps) to 7.5 MB declared, because the dev server serves each module separately. Warm load was quick (0.7 s desktop, 1.8 s simulated phone). I did not measure a cold load on your real phone over Tailscale, where it may be much slower. Hot reload is now off on this machine, so serving the production build (`vite preview`; its proxy is already configured) would cut this to a handful of files. *Fix:* decide after measuring a cold load on the phone.

| ID | Sev | Cert. | Status |
|---|---|---|---|
| X2 | Low | Confirmed | open |

**X2. `/favicon.ico` returns 404 on every load** (a console error). *Fix:* add the `<link rel="icon">` or the file.

---

## Questions for you (things I can't judge)

1. **Sample data (T2, T3, T5):** which Calendar events and todos, Projects, Lab apps and crons are real? I'd rather not delete or hide something you use.
2. **Ops (T1):** do you want it rebuilt on real data, or removed until then?
3. **Dim small text (L6):** is the low-contrast look intentional?
4. **Rail dots (L5):** what do they mean, and are they worth keeping?
5. **Where should "Needs you" live (C1):** top bar badge, home card, both?

## What I did not test

Typing and sending in chat, approving or rejecting an approval, audio in Sound Lab, uploads, the Notes editor, keyboard shortcuts, notification permissions, touch gestures (swipe), the Beat DB and other Lab apps, and anything on a real phone (I used a phone-sized window). I also can't judge animation, feel or long-session behaviour from screenshots.
