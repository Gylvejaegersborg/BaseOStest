import { useCallback, useEffect, useState } from 'react'
import {
  fetchAgentMemory,
  fetchAgentEpisodicMemory,
  fetchAgentMemoryNominations,
  approveMemoryNomination,
  rejectMemoryNomination,
  type AgentOsEpisodicEntry,
  type AgentOsMemoryNomination,
  type AgentOsMemorySummary,
} from './sessionClient'

/**
 * One agent's memory state — curated memory (what's actually injected into
 * every turn), the raw episodic log behind it, and pending nominations
 * awaiting your approve/reject. Refetches on demand (`refresh()`); the
 * caller re-triggers it on a relevant event (a nomination being approved
 * elsewhere, a dreaming pass completing) rather than this hook holding its
 * own SSE subscription — agent-os doesn't publish a live event for either
 * yet (dreaming runs on a background timer, not per-turn), so polling via
 * an explicit refresh is the honest contract for now, same posture as
 * useAgentOsTasks.
 */
export function useAgentOsMemory(agentId: string | null) {
  const [summary, setSummary] = useState<AgentOsMemorySummary | null>(null)
  const [episodic, setEpisodic] = useState<AgentOsEpisodicEntry[]>([])
  const [nominations, setNominations] = useState<AgentOsMemoryNomination[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!agentId) {
      setSummary(null)
      setEpisodic([])
      setNominations([])
      return
    }
    try {
      const [s, e, n] = await Promise.all([
        fetchAgentMemory(agentId),
        fetchAgentEpisodicMemory(agentId),
        fetchAgentMemoryNominations(agentId, 'pending'),
      ])
      setSummary(s)
      setEpisodic(e)
      setNominations(n)
      setError('')
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not load memory')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  const approve = useCallback(
    async (nominationId: string, reviewNote?: string) => {
      if (!agentId) return
      await approveMemoryNomination(agentId, nominationId, reviewNote)
      await refresh()
    },
    [agentId, refresh],
  )

  const reject = useCallback(
    async (nominationId: string, reviewNote?: string) => {
      if (!agentId) return
      await rejectMemoryNomination(agentId, nominationId, reviewNote)
      await refresh()
    },
    [agentId, refresh],
  )

  return { summary, episodic, nominations, loading, error, refresh, approve, reject }
}
