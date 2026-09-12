import { useEffect, useMemo, useState } from 'react'
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

/**
 * Loads the authoritative agent roster from a running Agent-OS gateway
 * (agent-os/src/gateway/server.ts's GET /agents), merging its identity/
 * role/model/live-status fields onto the bundled presentational roster
 * (data/agents.ts) by id. Falls back to the bundled roster untouched when
 * no gateway URL is configured or it's unreachable — same live-vs-mock
 * contract as useDiscordBridge/useTeamState, so every consumer of this
 * hook degrades exactly the way the rest of the dashboard already does.
 */
export function useAgentOsAgents(): { agents: Agent[]; connection: AgentOsConnection } {
  const [connection, setConnection] = useState<AgentOsConnection>('connecting')
  const [remoteAgents, setRemoteAgents] = useState<AgentOsAgent[]>([])

  useEffect(() => {
    let cancelled = false

    if (!agentOsConfigured()) {
      setConnection('mock')
      return
    }

    setConnection('connecting')
    fetchAgents()
      .then((agents) => {
        if (cancelled) return
        setRemoteAgents(agents)
        setConnection('live')
      })
      .catch(() => {
        if (cancelled) return
        setRemoteAgents([])
        setConnection('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const agents = useMemo(() => {
    const byId = new Map(remoteAgents.map((a) => [a.id, a]))
    return AGENTS.map((local) => mergeAgent(local, byId.get(local.id)))
  }, [remoteAgents])

  return { agents, connection }
}
