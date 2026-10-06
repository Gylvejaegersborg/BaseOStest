import type { AgentOsAgent, AgentOsControl, AgentOsRevision, AgentOsStaleEntry, AgentOsWatch, AgentOsReview, AgentOsReviewDigest, AgentOsWork, AgentOsWorkStatus } from './types'

// Thin typed client for the Agent-OS gateway (agent-os/src/gateway/server.ts).
// Every function performs a plain fetch against the documented contract and
// throws on any failure — the hook (useAgentOsAgents) decides whether to
// fall back to the bundled presentational roster. Nothing here knows about
// React. Mirrors discorddash/bridgeClient.ts's shape deliberately — same
// "configured service, degrade to mock when unset/unreachable" contract.
//
// Contract Agent-OS's gateway implements (see that repo's
// src/gateway/server.ts):
//   GET  {base}/agents      -> { agents: AgentOsAgent[] }
//   GET  {base}/agents/:id  -> AgentOsAgent
//
// No credentials live here — the gateway itself has no auth yet (see its
// own documented limitations), so this is meant for a trusted local/LAN
// deployment only, same posture as the Discord bridge client.

const BASE = import.meta.env.VITE_AGENT_OS_GATEWAY_URL?.replace(/\/$/, '')

/** Whether an Agent-OS gateway URL is configured at build time. */
export function agentOsConfigured(): boolean {
  return Boolean(BASE)
}

async function getJSON<T>(path: string, timeoutMs = 3000): Promise<T> {
  if (!BASE) throw new Error('agent-os gateway not configured')
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`agent-os gateway ${res.status} on ${path}`)
  return res.json() as Promise<T>
}

async function writeJSON<T>(method: 'POST' | 'PUT', path: string, body: unknown, timeoutMs = 5000): Promise<T> {
  if (!BASE) throw new Error('agent-os gateway not configured')
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => null)
    throw new Error(errBody?.error ?? `agent-os gateway ${res.status} on ${path}`)
  }
  return res.json() as Promise<T>
}

async function deleteJSON<T>(path: string, timeoutMs = 5000): Promise<T> {
  if (!BASE) throw new Error('agent-os gateway not configured')
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) {
    const errBody = await res.json().catch(() => null)
    throw new Error(errBody?.error ?? `agent-os gateway ${res.status} on ${path}`)
  }
  return res.json() as Promise<T>
}

// ---- BaseSpace bridge ------------------------------------------------------
// The agents' view of BaseSpace (a snapshot BaseSpace pushes) and BaseSpace's
// view of what the agents added (the overlay). See agent-os's
// gateway/basespace.ts.

/** What the agents have added to BaseSpace (notes, todos, projects, …). */
export function fetchOverlay<T>(): Promise<T> {
  return getJSON<T>('/basespace/overlay')
}

/** Push BaseSpace's current state for the agents to read. */
export function pushSnapshot(snapshot: unknown): Promise<{ ok: true; savedAt: string; bytes: number }> {
  return writeJSON('POST', '/basespace/snapshot', snapshot, 15000)
}

export async function fetchAgents(): Promise<AgentOsAgent[]> {
  // Generous: this is the call that decides whether BaseSpace says Agent-OS is connected, and a busy gateway can take a few seconds.
  const { agents } = await getJSON<{ agents: AgentOsAgent[] }>('/agents', 12_000)
  return agents
}

/** Board controls (agent-os's controls.ts) — operator-only levers. */
export const pauseAgent = (id: string, reason?: string) =>
  writeJSON<AgentOsControl>('POST', `/agents/${encodeURIComponent(id)}/pause`, { reason })
export const resumeAgent = (id: string) => writeJSON<AgentOsControl>('POST', `/agents/${encodeURIComponent(id)}/resume`, {})
/** `limitTokens: null` removes the budget (unlimited). */
export const setAgentBudget = (id: string, budget: { period: 'day' | 'week' | 'month'; limitTokens: number | null }) =>
  writeJSON<AgentOsControl>('PUT', `/agents/${encodeURIComponent(id)}/budget`, budget)

// Config history (agent-os's governance.ts) — operator-only, like budgets.
export const fetchAgentRevisions = (id: string) =>
  getJSON<{ revisions: AgentOsRevision[] }>(`/agents/${encodeURIComponent(id)}/revisions`).then((r) => r.revisions)
export const restoreAgentRevision = (id: string, rev: number) =>
  writeJSON<{ revisions: AgentOsRevision[] }>('POST', `/agents/${encodeURIComponent(id)}/revisions/${rev}/restore`, {}).then((r) => r.revisions)

/** A model provider as the gateway reports it (GET /providers). */
export interface AgentOsProvider {
  name: string
  available: boolean
  detail: string
}

/** Which providers the gateway can use. Older gateways without the route
 *  reject — callers treat that as "unknown", not "none". */
export async function fetchProviders(): Promise<AgentOsProvider[]> {
  const { providers } = await getJSON<{ providers: AgentOsProvider[] }>('/providers')
  return providers
}

export function fetchAgent(id: string): Promise<AgentOsAgent> {
  return getJSON<AgentOsAgent>(`/agents/${encodeURIComponent(id)}`)
}

export interface CreateAgentInput {
  id: string
  name: string
  persona: string
  role?: string
  capabilities?: string[]
  defaultModel?: string
  reportsTo?: string
}

/** POST {base}/agents — registers a brand-new agent identity on the
 *  gateway (agent-os's registerAgent()). 409s if the id already exists. */
export function createAgent(input: CreateAgentInput): Promise<AgentOsAgent> {
  return writeJSON<AgentOsAgent>('POST', '/agents', input)
}

export interface UpdateAgentInput {
  name?: string
  persona?: string
  role?: string
  capabilities?: string[]
  defaultModel?: string
  /** An agent id, or null for "reports to the operator". */
  reportsTo?: string | null
}

/** PUT {base}/agents/:id — updates an existing agent's identity fields
 *  (agent-os's updateAgent()). Live status/currentTask/model routing stay
 *  server-derived, not editable here. */
// ---- Work handed between agents (agent-os's core/work.ts) ----

/** `team`: the agent's own work plus its reports' (for a lead; same as `involving` otherwise). */
export async function fetchWork(filter: { involving?: string; team?: string; status?: AgentOsWorkStatus } = {}): Promise<AgentOsWork[]> {
  const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][]).toString()
  const { work } = await getJSON<{ work: AgentOsWork[] }>(`/work${q ? `?${q}` : ''}`)
  return work
}
export const assignWork = (input: { assignee: string; title: string; detail?: string; focus?: { kind: 'goal' | 'project'; id: string }; verify?: boolean }) =>
  writeJSON<AgentOsWork>('POST', '/work', input)
export const cancelWork = (id: string, reason?: string) => writeJSON<AgentOsWork>('POST', `/work/${encodeURIComponent(id)}/cancel`, { reason })
export const reopenWork = (id: string, reason?: string) => writeJSON<AgentOsWork>('POST', `/work/${encodeURIComponent(id)}/reopen`, { reason })
export const reassignWork = (id: string, to: string, reason?: string) =>
  writeJSON<AgentOsWork>('POST', `/work/${encodeURIComponent(id)}/reassign`, { to, reason })

// ---- Team templates: the team as markdown files (agent-os's team-template.ts) ----
export interface AgentOsTeamImportPlan {
  create: string[]
  update: { id: string; fields: string[] }[]
  unchanged: string[]
  skills: { add: string[]; update: string[]; unchanged: string[] }
  problems: string[]
  applied: boolean
}
export const exportTeamTemplate = () => getJSON<{ files: Record<string, string>; bundle: string }>('/team/export', 10000)
/** apply: false previews; true applies (only if there are no problems). */
export async function importTeamTemplate(bundle: string, apply: boolean): Promise<AgentOsTeamImportPlan> {
  if (!BASE) throw new Error('agent-os gateway not configured')
  const res = await fetch(`${BASE}/team/import`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ bundle, apply }),
    signal: AbortSignal.timeout(30000),
  })
  // A 409 still carries the plan (with its problems).
  return res.json() as Promise<AgentOsTeamImportPlan>
}

// ---- Stale work: stuck or badly-ended runs (agent-os's stale.ts) ----
export const fetchStale = () => getJSON<{ stale: AgentOsStaleEntry[]; quietMinutes: number }>('/stale')

// ---- Watchdog: a verifier checks finished work (agent-os's watchdog.ts) ----
export const fetchWatches = () => getJSON<{ watches: AgentOsWatch[]; verifier: string }>('/watches')
export const verifyWork = (id: string) => writeJSON<AgentOsWatch>('POST', `/work/${encodeURIComponent(id)}/verify`, {})

// ---- Team reviews: a lead looks over its team's work (core/review.ts) ----
export const fetchReviews = (agentId?: string) =>
  getJSON<{ leads: string[]; reviews: AgentOsReview[] }>(`/reviews${agentId ? `?agentId=${encodeURIComponent(agentId)}` : ''}`)
export const fetchReviewDigest = (agentId: string) => getJSON<AgentOsReviewDigest>(`/reviews/${encodeURIComponent(agentId)}/digest`)
/** Runs a model turn for the lead — can take a minute or two. */
export const runReviewNow = (agentId: string) =>
  writeJSON<{ ran: boolean; reason?: string }>('POST', `/reviews/${encodeURIComponent(agentId)}`, {}, 300_000)

export function updateAgent(id: string, input: UpdateAgentInput): Promise<AgentOsAgent> {
  return writeJSON<AgentOsAgent>('PUT', `/agents/${encodeURIComponent(id)}`, input)
}

// ---- Skills — agentskills.io-format instructions every agent shares
// (agent-os's skills.ts). Human-managed: this is a settings surface for
// the operator to curate the catalog directly, not something an agent
// writes to itself. ----

export interface SkillMetadata {
  name: string
  description: string
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
  allowedTools?: string[]
}

export interface SkillFull extends SkillMetadata {
  body: string
}

export async function fetchSkills(): Promise<SkillMetadata[]> {
  const { skills } = await getJSON<{ skills: SkillMetadata[] }>('/skills')
  return skills
}

export function fetchSkill(name: string): Promise<SkillFull> {
  return getJSON<SkillFull>(`/skills/${encodeURIComponent(name)}`)
}

export interface SaveSkillInput {
  name: string
  description: string
  body: string
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
  allowedTools?: string[]
}

/** POST {base}/skills — creates or overwrites a skill by name (agent-os's
 *  writeSkill() + a hot-registration into the live catalog, no gateway
 *  restart needed). */
export function saveSkill(input: SaveSkillInput): Promise<SkillFull> {
  return writeJSON<SkillFull>('POST', '/skills', input)
}

export function deleteSkill(name: string): Promise<{ ok: true }> {
  return deleteJSON<{ ok: true }>(`/skills/${encodeURIComponent(name)}`)
}

/** POST {base}/skills/install — fetches a raw SKILL.md from any URL
 *  server-side and installs it exactly like a hand-authored one. */
export function installSkillFromUrl(url: string): Promise<SkillFull> {
  return writeJSON<SkillFull>('POST', '/skills/install', { url })
}

// ---- Configured hooks — read-only visibility into agent-os's
// hooks.json (configured-hooks.ts). No write here on purpose: editing
// the file and restarting the gateway is the real contract (hooks.ts's
// registry has no hot-reload/removal-by-source mechanism), so this is
// "what's actually loaded right now," not an editor. ----

export interface ConfiguredHook {
  event: string
  command: string
  matchTool?: string
  label?: string
}

export interface Connector {
  name: string
  kind: 'account' | 'local'
  target: string
  status: 'connected' | 'needs-auth' | 'failed'
  enabled: boolean
  toolPrefix: string
}

/** The MCP connectors the agents can reach through the Claude CLI (agent-os's connectors.ts). `refresh` re-reads the account first (slow: ~10 s). */
export async function fetchConnectors(refresh = false): Promise<{ connectors: Connector[]; refreshedAt?: string }> {
  if (!BASE) throw new Error('agent-os gateway not configured')
  const res = await fetch(`${BASE}/connectors${refresh ? '?refresh=1' : ''}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(refresh ? 90_000 : 5000) })
  if (!res.ok) throw new Error(`agent-os gateway ${res.status} on /connectors`)
  return res.json()
}

export function setConnectorEnabled(name: string, enabled: boolean): Promise<Connector> {
  return writeJSON<Connector>('PUT', `/connectors/${encodeURIComponent(name)}`, { enabled })
}

export async function fetchConfiguredHooks(): Promise<ConfiguredHook[]> {
  const { hooks } = await getJSON<{ hooks: ConfiguredHook[] }>('/hooks')
  return hooks
}
