import { useCallback, useEffect, useState } from 'react'
import { useAgentOsContext } from './AgentOsProvider'
import { agentOsGatewayConfigured, fetchPendingApprovals, resolveApproval, subscribeToEvents, type AgentOsApproval } from './sessionClient'

export type AgentOsApprovalsConnection = 'unconfigured' | 'connecting' | 'live' | 'error'

/**
 * Live list of pending Agent-OS tool-execution approvals (agent-os's
 * approvals.ts), refetched whenever the gateway publishes an
 * approval.requested/approval.resolved event over SSE — real human-in-
 * the-loop visibility for the "approval requested" requirement (see the
 * architecture plan's Approval system section), surfaced in Team.tsx
 * alongside (not merged into) the existing content-publish approval queue.
 */
export function useAgentOsApprovalsSource() {
  const [connection, setConnection] = useState<AgentOsApprovalsConnection>('connecting')
  const [approvals, setApprovals] = useState<AgentOsApproval[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const list = await fetchPendingApprovals()
      setApprovals(list)
      setConnection('live')
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not reach Agent-OS')
      setConnection('error')
    }
  }, [])

  useEffect(() => {
    if (!agentOsGatewayConfigured()) {
      setConnection('unconfigured')
      return
    }
    setConnection('connecting')
    refresh()
    const dispose = subscribeToEvents(['approval.requested', 'approval.resolved'], () => refresh())
    return dispose
  }, [refresh])

  const act = useCallback(
    async (id: string, decision: 'approve' | 'reject') => {
      setBusyId(id)
      setError('')
      try {
        await resolveApproval(id, decision, 'dashboard-user')
        await refresh()
      } catch (err) {
        setError((err as Error)?.message ?? `Could not ${decision} the request`)
      } finally {
        setBusyId(null)
      }
    },
    [refresh],
  )

  return { connection, approvals, busyId, error, act }
}

export type AgentOsApprovalsState = ReturnType<typeof useAgentOsApprovalsSource>

/** The app-wide approvals state — one fetch + one event subscription,
 *  owned by AgentOsProvider and shared by the nav rail, the Workbench
 *  strip's glow and the Approvals tab. */
export function useAgentOsApprovals(): AgentOsApprovalsState {
  return useAgentOsContext().approvals
}
