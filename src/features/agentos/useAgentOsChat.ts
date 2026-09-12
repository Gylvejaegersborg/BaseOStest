import { useCallback, useEffect, useRef, useState } from 'react'
import {
  agentOsGatewayConfigured,
  cancelChatSession,
  createChatSession,
  getSessionHistory,
  listChatSessions,
  renameChatSession,
  sendTurn,
  subscribeToSessionEvents,
  type AgentOsSession,
} from './sessionClient'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
}

export type ChatConnection = 'unconfigured' | 'connecting' | 'ready' | 'error'

function fmtTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** Turns Agent-OS's raw session-history messages (role/content only — the
 * underlying runtime doesn't carry a per-message timestamp yet, see
 * agent-loop.ts's getSessionHistory()) into the UI's ChatMessage shape.
 * 'system'/'tool' rows are dropped from the rendered transcript for now —
 * tool-call visibility is instead surfaced as a live "working" indicator
 * via the SSE subscription below, not a full inline transcript entry;
 * showing tool calls/approvals inline is real future work, not silently
 * decided against. */
function toChatMessages(history: { role: string; content: string }[]): ChatMessage[] {
  return history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m, i) => ({ id: `h${i}`, role: m.role as 'user' | 'assistant', text: m.content, time: '' }))
}

/**
 * Owns one Agent-OS session's worth of chat state for a given agentId:
 * session creation/resume, sending turns, live activity via SSE, and
 * cancellation. Replaces Chat.tsx's previous direct-Anthropic-fetch
 * logic — this is the "no direct Anthropic API call from the browser"
 * requirement made real. Falls back to an 'unconfigured'/'error'
 * connection state (no mock chat — there is nothing honest to fake here)
 * when no gateway is set or it's unreachable, same posture as
 * useAgentOsAgents/useTeamState/useDiscordBridge elsewhere in this repo.
 */
export function useAgentOsChat(agentId: string) {
  const [connection, setConnection] = useState<ChatConnection>('connecting')
  const [errorText, setErrorText] = useState('')
  const [sessions, setSessions] = useState<AgentOsSession[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [workingOn, setWorkingOn] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')

  const sessionIdRef = useRef<string | null>(null)
  sessionIdRef.current = sessionId

  const refreshHistory = useCallback(async (id: string) => {
    try {
      const history = await getSessionHistory(id)
      setMessages(toChatMessages(history))
    } catch {
      /* keep whatever's currently shown rather than blanking the transcript */
    }
  }, [])

  const refreshSessions = useCallback(async (): Promise<AgentOsSession[]> => {
    const list = await listChatSessions(agentId)
    setSessions(list)
    return list
  }, [agentId])

  // Bootstrap: pick the most recently active session for this agent, or
  // create one if none exist yet — same "resume, don't restart" contract
  // a durable session store should have.
  useEffect(() => {
    let cancelled = false
    if (!agentOsGatewayConfigured()) {
      setConnection('unconfigured')
      return
    }
    setConnection('connecting')
    ;(async () => {
      try {
        const list = await refreshSessions()
        // Checked HERE, before any createChatSession() call — not just
        // once at the end — specifically because React 18 StrictMode's
        // dev-mode double-invoke (mount -> cleanup -> mount again,
        // synchronously, before this await resolves) would otherwise let
        // a cancelled run still create a real session it never uses: two
        // "create if none exist" bootstraps racing past this same check
        // is exactly how a duplicate session got created before this
        // guard was moved up.
        if (cancelled) return
        const mostRecent = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
        let session = mostRecent
        if (!session) {
          session = await createChatSession(agentId)
          if (cancelled) return
          await refreshSessions() // so the sidebar shows the new thread immediately, not just after the first send
        }
        if (cancelled) return
        setSessionId(session.id)
        await refreshHistory(session.id)
        if (cancelled) return
        setConnection('ready')
      } catch (err) {
        if (cancelled) return
        setErrorText((err as Error)?.message ?? 'Could not reach Agent-OS')
        setConnection('error')
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId])

  // Live activity for the CURRENT session, via the real event bus over SSE.
  useEffect(() => {
    if (!sessionId || connection !== 'ready') return
    const dispose = subscribeToSessionEvents(sessionId, (e) => {
      if (e.type === 'agent.turn.start') {
        setStreaming(true)
        setWorkingOn(null)
        setStreamingText('')
      } else if (e.type === 'agent.turn.delta') {
        // Real incremental text — see agent-os's agent-loop.ts/model.ts:
        // this is the actual provider-level stream, not a simulated
        // typing effect. Appended live, ahead of the durable
        // session.message refreshHistory() picks up once the turn ends.
        setStreamingText((t) => t + String(e.payload.delta ?? ''))
      } else if (e.type === 'tool.call.start') {
        setWorkingOn(String(e.payload.name ?? 'a tool'))
      } else if (e.type === 'tool.call.end') {
        setWorkingOn(null)
      } else if (e.type === 'agent.turn.end') {
        setStreaming(false)
        setWorkingOn(null)
        setStreamingText('')
        refreshHistory(sessionId)
      } else if (e.type === 'session.status.changed' && e.payload.status === 'cancelled') {
        setStreaming(false)
        setWorkingOn(null)
        setStreamingText('')
        refreshHistory(sessionId)
      }
    })
    return dispose
  }, [sessionId, connection, refreshHistory])

  const send = useCallback(
    async (text: string) => {
      const id = sessionIdRef.current
      if (!id || connection !== 'ready' || !text.trim()) return

      const optimistic: ChatMessage = { id: `local-${Date.now()}`, role: 'user', text, time: fmtTime() }
      setMessages((m) => [...m, optimistic])
      setStreaming(true)

      try {
        await sendTurn(id, text)
      } catch (err) {
        setMessages((m) => [
          ...m,
          { id: `err-${Date.now()}`, role: 'assistant', text: `⚠ ${(err as Error)?.message ?? 'Turn failed'}`, time: fmtTime() },
        ])
      } finally {
        setStreaming(false)
        setWorkingOn(null)
        refreshHistory(id)
        refreshSessions()
      }
    },
    [connection, refreshHistory, refreshSessions],
  )

  const cancel = useCallback(async () => {
    const id = sessionIdRef.current
    if (!id) return
    try {
      await cancelChatSession(id, 'user requested stop')
    } catch {
      /* best-effort — the SSE session.status.changed handler above also catches a successful cancel */
    }
  }, [])

  const newSession = useCallback(async () => {
    if (connection !== 'ready') return
    const session = await createChatSession(agentId)
    setSessionId(session.id)
    setMessages([])
    await refreshSessions()
  }, [agentId, connection, refreshSessions])

  const switchSession = useCallback(
    (id: string) => {
      setSessionId(id)
      refreshHistory(id)
    },
    [refreshHistory],
  )

  const rename = useCallback(
    async (id: string, title: string) => {
      await renameChatSession(id, title)
      await refreshSessions()
    },
    [refreshSessions],
  )

  return {
    connection, errorText, sessions, sessionId, messages, streaming, workingOn, streamingText,
    send, cancel, newSession, switchSession, rename,
  }
}
