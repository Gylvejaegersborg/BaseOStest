import { useCallback, useEffect, useMemo, useState } from 'react'
import { AGENTS, type Agent } from '@/data/agents'
import { agentOsConfigured, fetchAgents } from './client'
import type { AgentOsAgent, AgentOsConnection } from './types'

/** Presentational-only fields (color, canned chatter, stats) stay owned by
 * BaseOS's static roster — see agent-os's agents.ts header for why those
 * deliberately never got a place in the authoritative record. Everything
 * else (role, model, live status) is replaced by the gateway's answer when
 * one is available for that id, leaving ids Agent-OS doesn't know about
 * (the nyx-w1/nyx-w2 sub-agents) exactly as they were. */
function mergeAgent(local: Agent, remote: AgentOsAgent | undefined): Agent {
  if (!remote) return local
  return {
    ...local,
    name: remote.name,
    role: remote.role ?? local.role,
    model: remote.defaultModel ?? local.model,
    status: remote.status === 'active' ? 'working' : 'idle',
  }
}

// A small fixed palette for agents created live (via the Workbench's "new
// agent" form) that have no entry in the bundled presentational roster —
// deterministic per id so a given agent keeps the same color across
// reloads without needing its own persisted color field anywhere.
const SYNTH_PALETTE = ['#c77591', '#f0a020', '#e0408a', '#58b6f0', '#46d369', '#b07ce8', '#e3d24b', '#ff6b6b']

function synthColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return SYNTH_PALETTE[h % SYNTH_PALETTE.length]
}

/** Turns a gateway-only agent (one the user created from the Workbench,
 *  not present in the bundled data/agents.ts roster) into the same
 *  presentational Agent shape everything else here renders. */
function synthesizeAgent(remote: AgentOsAgent): Agent {
  return {
    id: remote.id,
    name: remote.name,
    role: remote.role ?? remote.persona.slice(0, 60),
    model: remote.defaultModel ?? 'claude · team',
    color: synthColor(remote.id),
    status: remote.status === 'active' ? 'working' : 'idle',
    task: remote.currentTaskId ? 'Working…' : 'Idle — no task yet',
    stats: { tasksDone: remote.metrics.tasks.total, tokens: '—', uptime: '—', load: 0 },
    chatter: [],
  }
}

/**
 * Loads the authoritative agent roster from a running Agent-OS gateway
 * (agent-os/src/gateway/server.ts's GET /agents), merging its identity/
 * role/model/live-status fields onto the bundled presentational roster
 * (data/agents.ts) by id, PLUS any agent the gateway knows about that
 * isn't in the bundled roster at all — e.g. one created live from the
 * Workbench's agent editor — synthesized with a deterministic color so it
 * renders like any other. Falls back to the bundled roster untouched when
 * no gateway URL is configured or it's unreachable — same live-vs-mock
 * contract as useDiscordBridge/useTeamState, so every consumer of this
 * hook degrades exactly the way the rest of the dashboard already does.
 */
export function useAgentOsAgents(): { agents: Agent[]; connection: AgentOsConnection; refresh: () => void } {
  const [connection, setConnection] = useState<AgentOsConnection>('connecting')
  const [remoteAgents, setRemoteAgents] = useState<AgentOsAgent[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (!agentOsConfigured()) {
      setConnection('mock')
      return
    }

    setConnection((c) => (c === 'live' ? c : 'connecting'))
    fetchAgents()
      .then((agents) => {
        if (cancelled) return
        setRemoteAgents(agents)
        setConnection('live')
      })
      .catch(() => {
        if (cancelled) return
        setConnection('error')
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const agents = useMemo(() => {
    const byId = new Map(remoteAgents.map((a) => [a.id, a]))
    const merged = AGENTS.map((local) => mergeAgent(local, byId.get(local.id)))
    const localIds = new Set(AGENTS.map((a) => a.id))
    const extra = remoteAgents.filter((a) => !localIds.has(a.id)).map(synthesizeAgent)
    return [...merged, ...extra]
  }, [remoteAgents])

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  return { agents, connection, refresh }
}
