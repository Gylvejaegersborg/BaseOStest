import { useEffect, useState } from 'react'
import { fetchSessionUsage, type AgentOsSessionUsage } from './sessionClient'

/**
 * Token usage for one session — ROADMAP.md's "cost/token usage tracking"
 * item, surfaced. Re-fetches whenever the session changes or a turn just
 * finished (agent-os doesn't publish a live event for usage, so
 * `streaming` flipping back to false after being true is the signal —
 * same honest "poll on the obvious trigger, don't pretend it's a live
 * feed" contract as useAgentOsMemory). Returns null while unconfigured/
 * loading/errored — callers render nothing rather than a fabricated 0.
 */
export function useAgentOsSessionUsage(sessionId: string | null, streaming: boolean): AgentOsSessionUsage | null {
  const [usage, setUsage] = useState<AgentOsSessionUsage | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setUsage(null)
      return
    }
    let cancelled = false
    fetchSessionUsage(sessionId)
      .then((u) => {
        if (!cancelled) setUsage(u)
      })
      .catch(() => {
        if (!cancelled) setUsage(null)
      })
    return () => {
      cancelled = true
    }
    // Re-fetch on every streaming->false transition (a turn just ended),
    // not just when the session id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, streaming])

  return usage
}
