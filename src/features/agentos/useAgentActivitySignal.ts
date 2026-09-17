import { useAgentOsContext } from './AgentOsProvider'
import { useAgentOsApprovals } from './useAgentOsApprovals'

/**
 * The rail's hybrid ambient indicator (Phase 2 shell decision): an ambient
 * pulse for "activity happening" (any agent working/thinking) plus a
 * concrete badge count only for items that need action (pending
 * approvals) — ambient and actionable are reported separately so a
 * consumer (NavBar's Workbench icon today, Ops later) can render both.
 */
export function useAgentActivitySignal() {
  const { agents } = useAgentOsContext()
  const { approvals } = useAgentOsApprovals()

  const ambient = agents.some((a) => a.status === 'working' || a.status === 'thinking')
  const actionable = approvals.length

  return { ambient, actionable }
}
