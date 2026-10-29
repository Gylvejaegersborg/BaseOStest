import { useCallback, useEffect, useState } from 'react'
import { agentOsConfigured, fetchNeedsYou, type AgentOsNeedsYou } from './client'
import { subscribeToEvents } from './sessionClient'

const EMPTY: AgentOsNeedsYou = { total: 0, approvals: [], todos: [] }

/**
 * What is waiting on the operator right now: pending approvals and the open todos the agents created (with the flow each came
 * from). Shown in the notification bell. Refreshes when the gateway says something relevant changed (shares the one event
 * stream, see sessionClient.ts) and every minute as a fallback.
 */
export function useNeedsYou(): AgentOsNeedsYou {
  const [data, setData] = useState<AgentOsNeedsYou>(EMPTY)

  const refresh = useCallback(async () => {
    try {
      setData(await fetchNeedsYou())
    } catch {
      /* gateway unreachable: keep what we had */
    }
  }, [])

  useEffect(() => {
    if (!agentOsConfigured()) return
    void refresh()
    const dispose = subscribeToEvents(['approval.requested', 'approval.resolved', 'basespace.overlay.updated', 'basespace.todo.completed', 'flow.completed'], () => void refresh())
    const id = window.setInterval(() => void refresh(), 60_000)
    return () => {
      dispose()
      window.clearInterval(id)
    }
  }, [refresh])

  return data
}
