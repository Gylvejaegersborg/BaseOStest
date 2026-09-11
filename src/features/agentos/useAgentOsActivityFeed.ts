import { useEffect, useRef, useState } from 'react'
import { agentOsGatewayConfigured, subscribeToEvents } from './sessionClient'

export interface ActivityItem {
  id: string
  agentId: string
  text: string
  time: string
}

const FEED_EVENT_TYPES = ['agent.turn.start', 'tool.call.start', 'tool.call.end', 'agent.turn.end']
const MAX_ITEMS = 24

function fmtTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}

function describe(type: string, payload: Record<string, unknown>): string | null {
  switch (type) {
    case 'agent.turn.start': {
      const msg = String(payload.userMessage ?? '')
      return `started: "${msg.slice(0, 70)}${msg.length > 70 ? '…' : ''}"`
    }
    case 'tool.call.start':
      return `running ${String(payload.name ?? 'a tool')}…`
    case 'tool.call.end': {
      const result = payload.result as { ok?: boolean } | undefined
      return result?.ok === false ? `${String(payload.name ?? 'tool')} failed` : `finished ${String(payload.name ?? 'a tool')}`
    }
    case 'agent.turn.end': {
      if (payload.cancelled) return 'turn cancelled'
      const content = String(payload.finalContent ?? '')
      return content ? content.slice(0, 90) + (content.length > 90 ? '…' : '') : null
    }
    default:
      return null
  }
}

/**
 * Live feed of REAL Agent-OS runtime activity — every agent, unfiltered by
 * session — turned into short display lines. This is what lets
 * MeetingRoom show "what agents are actually doing right now" as a
 * genuine projection of the runtime (see the architecture plan's Phase 6)
 * instead of only ever replaying canned chatter or a committed meeting
 * transcript. Returns an empty, non-connected feed when no gateway is
 * configured — callers decide the simulated-chatter fallback themselves,
 * same split of responsibility as useAgentOsAgents/useAgentOsChat.
 */
export function useAgentOsActivityFeed(): { connected: boolean; feed: ActivityItem[] } {
  const [feed, setFeed] = useState<ActivityItem[]>([])
  const [connected, setConnected] = useState(false)
  const seenAny = useRef(false)

  useEffect(() => {
    if (!agentOsGatewayConfigured()) return
    const dispose = subscribeToEvents(FEED_EVENT_TYPES, (e) => {
      const agentId = typeof e.payload.agentId === 'string' ? e.payload.agentId : undefined
      if (!agentId) return
      const text = describe(e.type, e.payload)
      if (!text) return
      if (!seenAny.current) {
        seenAny.current = true
        setConnected(true)
      }
      setFeed((f) => [{ id: `${e.type}-${Date.now()}-${Math.random()}`, agentId, text, time: fmtTime() }, ...f].slice(0, MAX_ITEMS))
    })
    return dispose
  }, [])

  return { connected, feed }
}
