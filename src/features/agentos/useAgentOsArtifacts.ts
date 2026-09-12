import { useCallback, useEffect, useState } from 'react'
import { fetchArtifacts, type AgentOsArtifact } from './sessionClient'

/**
 * Real Agent-OS Artifacts (produced outputs — files, reports, plans —
 * attached to a Task/Session/Flow via the opt-in record-artifact tool),
 * filterable by producer/sessionId/taskId/flowId. Same on-demand refresh
 * contract as useAgentOsTasks.
 */
export function useAgentOsArtifacts(filter: { producer?: string; sessionId?: string; taskId?: string; flowId?: string } = {}) {
  const [artifacts, setArtifacts] = useState<AgentOsArtifact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const list = await fetchArtifacts(filter)
      setArtifacts(list)
      setError('')
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not load artifacts')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.producer, filter.sessionId, filter.taskId, filter.flowId])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  return { artifacts, loading, error, refresh }
}
