import { useCallback, useEffect, useState } from 'react'
import {
  subscribeToEvents,
  fetchFlow,
  fetchFlows,
  cancelFlow as cancelFlowRequest,
  resumeFlow as resumeFlowRequest,
  markFlowStepDone,
  writeFlowBriefing,
  fetchFlowReport,
  type AgentOsFlowReport,
  type AgentOsFlow,
  type FlowStepInput,
} from './sessionClient'
import { completeAgentTodo } from './client'

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
  const [report, setReport] = useState<AgentOsFlowReport | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!flowId) return
    try {
      const [f, r] = await Promise.all([fetchFlow(flowId), fetchFlowReport(flowId).catch(() => null)])
      setFlow(f)
      setReport(r)
      setError('')
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not load flow')
    }
  }, [flowId])

  useEffect(() => {
    setFlow(null)
    setReport(null)
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

  // The steps this flow was made of: the ones the caller remembers, else the gateway's stored definition.
  const known = steps.length ? steps : (flow?.definition?.steps ?? [])

  const resume = useCallback(async () => {
    if (!flowId) return
    setBusy(true)
    try {
      await resumeFlowRequest(flowId, known)
      setError('')
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not resume the flow')
    } finally {
      setBusy(false)
    }
    await refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, refresh, known])

  const markDone = useCallback(
    async (stepIds: string[]) => {
      if (!flowId) return
      setBusy(true)
      try {
        await markFlowStepDone(flowId, stepIds, known)
        setError('')
      } catch (err) {
        setError((err as Error)?.message ?? 'Could not mark the step done')
      } finally {
        setBusy(false)
      }
      await refresh()
    },
    [flowId, refresh, known],
  )

  /** Complete one of the flow's todos, with the answer when it was a question. */
  const completeTodo = useCallback(
    async (todoId: string, answer?: string) => {
      setBusy(true)
      try {
        await completeAgentTodo(todoId, answer)
        setError('')
      } catch (err) {
        setError((err as Error)?.message ?? 'Could not complete the todo')
      } finally {
        setBusy(false)
      }
      await refresh()
    },
    [refresh],
  )

  /** Have the flow's lead write (or rewrite) the briefing. One model call; it can take a minute. */
  const [briefing, setBriefing] = useState(false)
  const writeBriefing = useCallback(async () => {
    if (!flowId) return
    setBriefing(true)
    try {
      await writeFlowBriefing(flowId)
      setError('')
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not write the briefing')
    } finally {
      setBriefing(false)
    }
    await refresh()
  }, [flowId, refresh])

  return { flow, report, error, busy, briefing, writeBriefing, refresh, cancel, resume, markDone, completeTodo, steps: known }
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
