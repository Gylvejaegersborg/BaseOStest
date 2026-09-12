import { useCallback, useEffect, useState } from 'react'
import {
  subscribeToEvents,
  fetchFlow,
  fetchFlows,
  cancelFlow as cancelFlowRequest,
  resumeFlow as resumeFlowRequest,
  type AgentOsFlow,
  type FlowStepInput,
} from './sessionClient'

/**
 * Live view of ONE Flow — fetches it, then refreshes on its own
 * flow.step.started/flow.step.completed/flow.completed events (filtered
 * client-side by flowId, same pattern as sessionClient.ts's
 * subscribeToSessionEvents). `steps`
 * is the original FlowStepDefinition[] the Flow was created with —
 * required to resume() since agent-os's flow-engine.ts doesn't persist
 * agentId/goal server-side, only id/dependsOn/status (see its own
 * resumability docs).
 */
export function useAgentOsFlow(flowId: string | null, steps: FlowStepInput[]) {
  const [flow, setFlow] = useState<AgentOsFlow | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!flowId) return
    try {
      setFlow(await fetchFlow(flowId))
      setError('')
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not load flow')
    }
  }, [flowId])

  useEffect(() => {
    setFlow(null)
    if (!flowId) return
    refresh()
    const dispose = subscribeToEvents(['flow.step.started', 'flow.step.completed', 'flow.completed'], (e) => {
      if (e.payload.flowId === flowId) refresh()
    })
    return dispose
  }, [flowId, refresh])

  const cancel = useCallback(
    async (reason?: string) => {
      if (!flowId) return
      await cancelFlowRequest(flowId, reason)
      await refresh()
    },
    [flowId, refresh],
  )

  const resume = useCallback(async () => {
    if (!flowId) return
    await resumeFlowRequest(flowId, steps)
    await refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, refresh])

  return { flow, error, refresh, cancel, resume }
}

/** All Flows, for a picker/list view — refetches on demand and whenever
 * any flow's status changes, so a flow picked from this list doesn't show
 * a stale status after it completes elsewhere (e.g. the active flow shown
 * above it in FlowTab). */
export function useAgentOsFlowList() {
  const [flows, setFlows] = useState<AgentOsFlow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setFlows(await fetchFlows())
    } catch {
      /* keep whatever's currently shown */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const dispose = subscribeToEvents(['flow.step.started', 'flow.step.completed', 'flow.completed'], () => refresh())
    return dispose
  }, [refresh])

  return { flows, loading, refresh }
}
