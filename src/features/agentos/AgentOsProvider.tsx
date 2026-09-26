import { createContext, useContext, type ReactNode } from 'react'
import { useAgentOsAgents } from './useAgentOsAgents'
import { useAgentOsEventLog, type WorkbenchEvent } from './useAgentOsEventLog'
import type { AgentOsConnection } from './types'
import { useAgentOsApprovalsSource, type AgentOsApprovalsState } from './useAgentOsApprovals'
import type { Agent } from '@/data/agents'

interface AgentOsContextValue {
  agents: Agent[]
  connection: AgentOsConnection
  events: WorkbenchEvent[]
  /** Re-fetches the agent roster — call after creating or editing an
   *  agent from the Workbench so the change shows up without a reload. */
  refreshAgents: () => void
  /** Pending tool-call approvals (shared — see useAgentOsApprovals). */
  approvals: AgentOsApprovalsState
}

const AgentOsContext = createContext<AgentOsContextValue | null>(null)

/**
 * One shared Agent-OS connection for the whole app — a single agent-list
 * fetch and a single SSE event subscription, instead of every consumer
 * (TopBar, StatusBar, the Workbench's agent rail/Events tab, ...) opening
 * its own. This is the Phase 7 "converge into one coherent operating
 * surface" move made concrete at the data layer — the Workbench page is
 * what actually renders it now that Chat/Meeting/Team have been folded
 * into one page.
 */
export function AgentOsProvider({ children }: { children: ReactNode }) {
  const { agents, connection, refresh } = useAgentOsAgents()
  const events = useAgentOsEventLog()
  const approvals = useAgentOsApprovalsSource()
  return <AgentOsContext.Provider value={{ agents, connection, events, refreshAgents: refresh, approvals }}>{children}</AgentOsContext.Provider>
}

export function useAgentOsContext(): AgentOsContextValue {
  const ctx = useContext(AgentOsContext)
  if (!ctx) throw new Error('useAgentOsContext() must be called within <AgentOsProvider>')
  return ctx
}
