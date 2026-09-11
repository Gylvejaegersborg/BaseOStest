// Thin typed client for Agent-OS's session/turn/event API (agent-os's
// src/gateway/server.ts) — the primitives Chat.tsx needs to stop calling
// Anthropic directly from the browser. Mirrors client.ts's contract
// exactly (same VITE_AGENT_OS_GATEWAY_URL, same "throw on failure, let
// the caller decide the fallback" shape). Nothing here knows about React.

const BASE = import.meta.env.VITE_AGENT_OS_GATEWAY_URL?.replace(/\/$/, '')

export function agentOsGatewayConfigured(): boolean {
  return Boolean(BASE)
}

export interface AgentOsSession {
  id: string
  agentId: string
  status: 'active' | 'paused' | 'cancelled' | 'completed' | 'error'
  createdAt: string
  updatedAt: string
  title?: string
  parentSessionId?: string
  taskId?: string
  flowId?: string
}

export interface AgentOsHistoryMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  cancelled?: boolean
}

export interface AgentOsTurnResult {
  sessionId: string
  finalContent: string
  toolCalled?: string
  cancelled?: boolean
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 60000): Promise<T> {
  if (!BASE) throw new Error('agent-os gateway not configured')
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string })?.error ?? `agent-os gateway ${res.status} on ${path}`)
  }
  return res.json() as Promise<T>
}

export function createChatSession(agentId: string, title?: string): Promise<AgentOsSession> {
  return request<AgentOsSession>('/sessions', { method: 'POST', body: JSON.stringify({ agentId, title }) })
}

export async function listChatSessions(agentId: string): Promise<AgentOsSession[]> {
  const { sessions } = await request<{ sessions: AgentOsSession[] }>(`/sessions?agentId=${encodeURIComponent(agentId)}`)
  return sessions
}

export async function getSessionHistory(sessionId: string): Promise<AgentOsHistoryMessage[]> {
  const { history } = await request<{ history: AgentOsHistoryMessage[] }>(`/sessions/${sessionId}/history`)
  return history
}

/** Sends a message and awaits the FULL turn result — the gateway's
 *  POST /sessions/:id/turns does not stream incrementally yet (see its
 *  own documented limitation). Live activity DURING the turn (tool
 *  calls, cancellation) is instead observed via subscribeToSessionEvents
 *  below, concurrently with this call. A generous 120s timeout since a
 *  real model call plus tool hops can genuinely take a while. */
export function sendTurn(sessionId: string, userMessage: string): Promise<AgentOsTurnResult> {
  return request<AgentOsTurnResult>(`/sessions/${sessionId}/turns`, { method: 'POST', body: JSON.stringify({ userMessage }) }, 120000)
}

export function cancelChatSession(sessionId: string, reason?: string): Promise<AgentOsSession> {
  return request<AgentOsSession>(`/sessions/${sessionId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })
}

export interface AgentOsApproval {
  id: string
  agentId: string
  sessionId: string
  toolName: string
  args: Record<string, unknown>
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionNote?: string
}

/** Every pending tool-execution approval across every agent/session — the
 * durable, restart-surviving requests created when a PermissionPolicy rule
 * evaluates to "ask" with no synchronous callback (see agent-os's
 * approvals.ts). Deliberately a DIFFERENT thing from the GitHub-workflow
 * content-publish approval queue Team.tsx's ApprovalsTab already shows
 * (team/approvals/queue.json) — that's "should this YouTube upload go out,"
 * this is "should this agent be allowed to run this shell command." Shown
 * as a separate panel rather than merged into one list. */
export async function fetchPendingApprovals(): Promise<AgentOsApproval[]> {
  const { approvals } = await request<{ approvals: AgentOsApproval[] }>('/approvals?status=pending')
  return approvals
}

export function resolveApproval(id: string, decision: 'approve' | 'reject', resolvedBy?: string): Promise<AgentOsApproval> {
  return request<AgentOsApproval>(`/approvals/${id}/${decision}`, { method: 'POST', body: JSON.stringify({ resolvedBy }) })
}

export interface SessionEvent {
  type: string
  payload: Record<string, unknown>
}

/** Opens the gateway's SSE stream (GET /events?types=...) and forwards
 *  every event of the given types to onEvent, unfiltered by session —
 *  the raw building block both subscribeToSessionEvents (below, filtered
 *  to one session) and MeetingRoom's activity feed (unfiltered, every
 *  agent) are built on. Returns a disposer that closes the connection.
 *  Auto-reconnects with backoff, mirroring discorddash/bridgeClient.ts's
 *  openGateway() WebSocket reconnect shape (same problem, different
 *  transport: don't leave the UI silently stuck disconnected). */
export function subscribeToEvents(types: string[], onEvent: (e: SessionEvent) => void): () => void {
  if (!BASE) return () => {}

  const typesParam = types.join(',')
  let source: EventSource | null = null
  let retry = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  const connect = () => {
    if (disposed) return
    source = new EventSource(`${BASE}/events?types=${typesParam}`)
    for (const type of types) {
      source.addEventListener(type, (ev) => {
        try {
          const payload = JSON.parse((ev as MessageEvent).data)
          onEvent({ type, payload })
        } catch {
          /* ignore malformed frames */
        }
      })
    }
    source.onopen = () => {
      retry = 0
    }
    source.onerror = () => {
      source?.close()
      schedule()
    }
  }

  const schedule = () => {
    if (disposed) return
    const delay = Math.min(1000 * 2 ** retry, 16000)
    retry += 1
    timer = setTimeout(connect, delay)
  }

  connect()

  return () => {
    disposed = true
    clearTimeout(timer)
    source?.close()
  }
}

const SESSION_EVENT_TYPES = [
  'agent.turn.start',
  'agent.turn.delta',
  'tool.call.start',
  'tool.call.end',
  'agent.turn.end',
  'session.status.changed',
]

/** subscribeToEvents(), narrowed to one session — the gateway filters by
 *  event TYPE server-side (?types=) but not by session, so that half of
 *  the filtering happens here, client-side, against payload.sessionId. */
export function subscribeToSessionEvents(sessionId: string, onEvent: (e: SessionEvent) => void): () => void {
  return subscribeToEvents(SESSION_EVENT_TYPES, (e) => {
    if (e.payload.sessionId === sessionId) onEvent(e)
  })
}
