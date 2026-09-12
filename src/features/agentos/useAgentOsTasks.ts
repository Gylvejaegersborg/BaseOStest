import { useCallback, useEffect, useState } from 'react'
import { fetchTasks, type AgentOsTask, type AgentOsTaskStatus } from './sessionClient'

/**
 * Real Agent-OS Tasks (the runtime's own execution ledger — subagent
 * runs, Flow steps, CLI operations), filterable by agentId/flowId/status.
 * Refetches on demand (`refresh()`) — the caller re-triggers it when a
 * relevant event arrives (see useAgentOsEventLog) rather than this hook
 * holding its own SSE subscription, since the Workbench page already has
 * one shared log to watch.
 */
export function useAgentOsTasks(filter: { agentId?: string; flowId?: string; status?: AgentOsTaskStatus } = {}) {
  const [tasks, setTasks] = useState<AgentOsTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const list = await fetchTasks(filter)
      setTasks(list)
      setError('')
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not load tasks')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.agentId, filter.flowId, filter.status])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  return { tasks, loading, error, refresh }
}
