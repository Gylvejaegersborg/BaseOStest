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

export async function fetchAgents(): Promise<AgentOsAgent[]> {
  const { agents } = await getJSON<{ agents: AgentOsAgent[] }>('/agents')
  return agents
}

export function fetchAgent(id: string): Promise<AgentOsAgent> {
  return getJSON<AgentOsAgent>(`/agents/${encodeURIComponent(id)}`)
}
