import { createContext, useContext, type ReactNode } from 'react'
import { useAgentOsAgents } from './useAgentOsAgents'
import { useAgentOsActivityFeed, type ActivityItem } from './useAgentOsActivityFeed'
import type { AgentOsConnection } from './types'
import type { Agent } from '@/data/agents'

interface AgentOsContextValue {
  agents: Agent[]
  connection: AgentOsConnection
  activity: { connected: boolean; feed: ActivityItem[] }
}

const AgentOsContext = createContext<AgentOsContextValue | null>(null)

/**
 * One shared Agent-OS connection for the whole app — a single agent-list
 * fetch and a single SSE activity subscription, instead of every consumer
 * (TopBar, StatusBar, MeetingRoom, ...) opening its own. This is the
 * Phase 7 "converge into one coherent operating surface" move made
 * concrete at the data layer first, per the architecture plan's explicit
 * instruction not to over-design the UI before the runtime/plumbing is
 * right: Chat/Meeting/Team still render as separate pages, but they now
 * all read from the SAME live connection rather than each independently
 * re-deriving it.
 */
export function AgentOsProvider({ children }: { children: ReactNode }) {
  const { agents, connection } = useAgentOsAgents()
  const activity = useAgentOsActivityFeed()
  return <AgentOsContext.Provider value={{ agents, connection, activity }}>{children}</AgentOsContext.Provider>
}

export function useAgentOsContext(): AgentOsContextValue {
  const ctx = useContext(AgentOsContext)
  if (!ctx) throw new Error('useAgentOsContext() must be called within <AgentOsProvider>')
  return ctx
}
