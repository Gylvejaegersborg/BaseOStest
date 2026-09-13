import type { AgentOsAgent } from './types'

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

export async function fetchAgents(): Promise<AgentOsAgent[]> {
  const { agents } = await getJSON<{ agents: AgentOsAgent[] }>('/agents')
  return agents
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
}

/** PUT {base}/agents/:id — updates an existing agent's identity fields
 *  (agent-os's updateAgent()). Live status/currentTask/model routing stay
 *  server-derived, not editable here. */
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

export async function fetchConfiguredHooks(): Promise<ConfiguredHook[]> {
  const { hooks } = await getJSON<{ hooks: ConfiguredHook[] }>('/hooks')
  return hooks
}
