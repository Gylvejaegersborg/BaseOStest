# BaseOStest — personal OS dashboard for ISΛRK

React + TypeScript + Vite SPA (`src/`), Discord bridge (`server/`), weather proxy (`weather-proxy/`).
Build: `npm run typecheck && npm run build`. Path alias `@/` → `src/`.

## Agents

The ISΛRK agent team (Hemera, Nyx, Aether, Hermes, Theia, Mnemosyne, Argus, Claude) runs in
Agent-OS (github.com/gylvejaegersborg/agent-os), not in GitHub Actions. BaseSpace reaches the
gateway through the dev server's `/agent-os` proxy (see `vite.config.ts`).

- Teams and agent folders are a BaseSpace concern: `src/features/workbench/teams.ts`.
- Agents read BaseSpace through the snapshot BaseSpace pushes to the gateway
  (`POST /basespace/snapshot`, built in `src/features/agentos/snapshot.ts`).
- Agents write into BaseSpace through the overlay (`GET /basespace/overlay`,
  `src/features/overlay/osOverlay.tsx`). That is internal to the user's own OS and is not
  approval-gated. Anything outward-facing (uploads, posts, emails) goes through Agent-OS
  approvals — never published directly.
- The old GitHub team's output lives in `public/team-archive.json` (Notes → Team, plus its
  open board items imported once as todos). It is history; don't add to it.
- An agent's model (`defaultModel`, set in the agent editor) can name its provider:
  `claude-cli:sonnet` (your Claude subscription via the Claude Code CLI), `ollama:<model>`,
  `anthropic:<id>`, `openai:<id>`. See agent-os's README, "Model providers". `claude-cli` runs
  with thinking off; `claude-cli:sonnet+think` turns it on for one agent. Every model call resends
  the system prompt and tool list, so keep per-call context lean: agents only see tools they can use.
- Workbench → Terminal runs Claude Code (the real CLI, your own login) or a shell through the
  gateway (`/terminals`, agent-os's `src/gateway/terminal.ts`). Off unless the gateway has
  `AGENT_OS_TERMINAL=1`; the Codespace turns it on, so never make its ports public.
- Claude Code started from the Terminal gets the OS as MCP tools (agent-os's `/mcp`: read/add
  BaseSpace, list agents and approvals, ask an agent). No MCP tool decides approvals.
- Board controls (agent-os's `controls.ts`): pause/resume and per-agent token budgets, set in the
  agent editor. Operator-only — never give agents a way to change them.
- Goals (`src/features/goals/`) are what the work is for: a goal links projects and can sit under
  a bigger goal; notes link goals with `[[Goal title]]`; todos can serve a project or goal. The
  snapshot carries these links. A Workbench thread can be focused on a goal/project ("Serves…" in
  the thread header) — its agent then gets the chain, linked notes and open todos every turn, and
  what it adds links back. Keep new features on this connective layer; continuity is the point.
- Agents hand each other work as tracked items (agent-os's `core/work.ts`: `delegate` and `work`
  tools, a background runner), not chat. Reporting lines (`reportsTo`, agent editor) decide where
  hand-backs go. Work shows in Workbench → Tasks; results land in the asking thread as `[Work]`
  notes. An assignee can't cancel work — keep that rule.
- Leads (anyone with reports; Hemera) run a team review (agent-os's `core/review.ts`): a code-built
  digest of blocked, handed-back and quiet work; a model turn only when something needs attention
  and changed. They reopen, reassign or escalate through `work` — only the requester, the
  assignee's manager or the operator may. Escalations show as "needs you" (Workbench → Tasks).
- Governance (agent-os's `core/governance.ts`): hiring an agent (`propose-agent`) and a goal plan
  (`propose-plan`) always go to Approvals — enforced in the harness, never always-allowed. Agent
  config has a revision history with restore (agent editor → History); a restore is a new
  revision, never a rewrite.
- Watchdog (agent-os's `core/watchdog.ts`): "verify when done" on a work item or plan; once it
  has all stopped, Argus checks each claim against evidence the harness assembles (tool calls that
  ran, what was added to BaseSpace). The verifier reopens or escalates — it never fixes. Badges in
  Workbench → Tasks.
- All live updates share ONE EventSource (`subscribeToEvents` in `sessionClient.ts`). Never open
  another per component: browsers allow six connections per host, and extra streams stall every
  later request.
- The integrations plan (providers, Hindsight, knowledge graph, voice, CLI-Anything) lives in
  agent-os's `ROADMAP.md`.
- Be honest: agents can't hear audio, don't invent metrics or stream counts, and mark
  assumptions as assumptions.
