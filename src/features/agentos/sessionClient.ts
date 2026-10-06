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
  /** What this thread's work serves — a BaseSpace goal or project. Each turn
   *  then gets the goal chain, linked notes and open todos (agent-os). */
  focus?: AgentOsSessionFocus
}

export interface AgentOsSessionFocus {
  kind: 'goal' | 'project'
  id: string
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

export interface AgentOsSessionUsage {
  inputTokens: number
  outputTokens: number
  /** How many turns in this session actually reported usage — 0 means
   * "never reported" (the stub model, or a provider whose response
   * didn't carry it), not "really did use zero tokens." Treat 0 as
   * "nothing to show" rather than a real measurement. */
  turnsWithUsage: number
}

export function fetchSessionUsage(sessionId: string): Promise<AgentOsSessionUsage> {
  return request<AgentOsSessionUsage>(`/sessions/${sessionId}/usage`)
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
export function sendTurn(sessionId: string, userMessage: string, planMode?: boolean): Promise<AgentOsTurnResult> {
  return request<AgentOsTurnResult>(`/sessions/${sessionId}/turns`, { method: 'POST', body: JSON.stringify({ userMessage, planMode }) }, 120000)
}

export function cancelChatSession(sessionId: string, reason?: string): Promise<AgentOsSession> {
  return request<AgentOsSession>(`/sessions/${sessionId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })
}

/** Sets (or, with null, clears) what a thread's work serves. */
export function setSessionFocus(sessionId: string, focus: AgentOsSessionFocus | null): Promise<AgentOsSession> {
  return request<AgentOsSession>(`/sessions/${sessionId}/focus`, { method: 'PUT', body: JSON.stringify({ focus }) })
}

export function renameChatSession(sessionId: string, title: string): Promise<AgentOsSession> {
  return request<AgentOsSession>(`/sessions/${sessionId}/rename`, { method: 'POST', body: JSON.stringify({ title }) })
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
  /** Set once an approved request was used by the call it approved. */
  usedAt?: string
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

/** Approve or reject. `always` also adds an allowlist rule for the agent:
 *  'tool' = every call of this tool, 'exact' = just this exact call. */
export function resolveApproval(
  id: string,
  decision: 'approve' | 'reject',
  resolvedBy?: string,
  always?: 'tool' | 'exact',
): Promise<AgentOsApproval> {
  return request<AgentOsApproval>(`/approvals/${id}/${decision}`, { method: 'POST', body: JSON.stringify({ resolvedBy, always }) })
}

/** Recently decided approvals (newest first), for the Approvals tab's history. */
export async function fetchRecentDecisions(limit = 30): Promise<AgentOsApproval[]> {
  const [approved, rejected] = await Promise.all([
    request<{ approvals: AgentOsApproval[] }>('/approvals?status=approved'),
    request<{ approvals: AgentOsApproval[] }>('/approvals?status=rejected'),
  ])
  return [...approved.approvals, ...rejected.approvals]
    .sort((a, b) => (b.resolvedAt ?? b.requestedAt).localeCompare(a.resolvedAt ?? a.requestedAt))
    .slice(0, limit)
}

export async function fetchApproval(id: string): Promise<AgentOsApproval> {
  return request<AgentOsApproval>(`/approvals/${encodeURIComponent(id)}`)
}

// ---- Allowlist ("always allow" per agent — agent-os's allowlist.ts) ----

export interface AgentOsAllowRule {
  id: string
  agentId: string
  toolName: string
  /** Exact arguments allowed; absent = every call of the tool. */
  args?: Record<string, unknown>
  note?: string
  createdAt: string
  createdBy?: string
}

export async function fetchAllowRules(agentId?: string): Promise<{ rules: AgentOsAllowRule[]; exactOnlyTools: string[] }> {
  return request(`/allowlist${agentId ? `?agentId=${encodeURIComponent(agentId)}` : ''}`)
}

export function addAllowRule(input: { agentId: string; toolName: string; args?: Record<string, unknown> }): Promise<AgentOsAllowRule> {
  return request<AgentOsAllowRule>('/allowlist', { method: 'POST', body: JSON.stringify({ ...input, createdBy: 'dashboard-user' }) })
}

export function removeAllowRule(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/allowlist/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export type AgentOsTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'timed_out' | 'cancelled' | 'lost'

export interface AgentOsTask {
  id: string
  type: string
  agentId: string
  workerId?: string
  parentTaskId?: string
  flowId?: string
  status: AgentOsTaskStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
}

export async function fetchTasks(filter: { agentId?: string; flowId?: string; status?: AgentOsTaskStatus } = {}): Promise<AgentOsTask[]> {
  const params = new URLSearchParams()
  if (filter.agentId) params.set('agentId', filter.agentId)
  if (filter.flowId) params.set('flowId', filter.flowId)
  if (filter.status) params.set('status', filter.status)
  const qs = params.toString()
  const { tasks } = await request<{ tasks: AgentOsTask[] }>(`/tasks${qs ? `?${qs}` : ''}`)
  return tasks
}

export type AgentOsArtifactType = 'code' | 'file' | 'report' | 'image' | 'dataset' | 'plan' | 'draft' | 'other'

export interface AgentOsArtifact {
  id: string
  type: AgentOsArtifactType
  location: string
  producer: string
  createdAt: string
  taskId?: string
  sessionId?: string
  flowId?: string
  metadata: Record<string, unknown>
}

export async function fetchArtifacts(
  filter: { producer?: string; sessionId?: string; taskId?: string; flowId?: string } = {},
): Promise<AgentOsArtifact[]> {
  const params = new URLSearchParams()
  if (filter.producer) params.set('producer', filter.producer)
  if (filter.sessionId) params.set('sessionId', filter.sessionId)
  if (filter.taskId) params.set('taskId', filter.taskId)
  if (filter.flowId) params.set('flowId', filter.flowId)
  const qs = params.toString()
  const { artifacts } = await request<{ artifacts: AgentOsArtifact[] }>(`/artifacts${qs ? `?${qs}` : ''}`)
  return artifacts
}

export type AgentOsFlowStatus = 'running' | 'succeeded' | 'failed' | 'cancelled'

export interface AgentOsFlowStep {
  id: string
  taskId?: string
  dependsOn: string[]
  status: AgentOsTaskStatus
}

export interface AgentOsFlow {
  id: string
  /** What whoever made it called it (older flows have none). */
  title?: string
  /** What it was made of, when the gateway knows (flows made by an agent or through the gateway). */
  definition?: { title?: string; summary?: string; proposedBy?: string; steps: FlowStepInput[] } | null
  kind: 'managed' | 'mirrored'
  status: AgentOsFlowStatus
  steps: AgentOsFlowStep[]
  revision: number
}

export interface FlowStepInput {
  id: string
  agentId: string
  goal: string
  dependsOn?: string[]
  retries?: number
}

/** Creates a Flow and starts driving it in the BACKGROUND on the gateway
 *  — returns as soon as the Flow is created (agent-os's POST /flows does
 *  not block on the whole DAG, which can take minutes). Watch progress
 *  via subscribeToEvents(['flow.step.started','flow.step.completed',
 *  'flow.completed']) or by polling fetchFlow(). */
/** `focus`: what the flow serves — every step runs focused on it. */
export function createFlow(steps: FlowStepInput[], focus?: AgentOsSessionFocus, title?: string): Promise<AgentOsFlow> {
  return request<AgentOsFlow>('/flows', { method: 'POST', body: JSON.stringify({ steps, ...(focus ? { focus } : {}), ...(title ? { title } : {}) }) })
}

export function fetchFlow(flowId: string): Promise<AgentOsFlow> {
  return request<AgentOsFlow>(`/flows/${flowId}`)
}

/** Everything about one flow in one answer (agent-os's flow-report.ts): per step the goal, agent, every attempt, what it
 *  said, its tool calls, what it added to BaseSpace and its tokens. */
export interface AgentOsFlowReportAttempt {
  taskId: string
  status: string
  startedAt?: string
  completedAt?: string
  seconds?: number
  sessionId?: string
  result?: string
  error?: string
  tokens?: { input: number; output: number }
  toolCalls: { name: string; summary: string; ok: boolean }[]
  added: { kind: string; title: string; folder?: string }[]
}
export interface AgentOsFlowReportStep {
  id: string
  agentId?: string
  goal?: string
  dependsOn: string[]
  status: AgentOsTaskStatus
  attempts: AgentOsFlowReportAttempt[]
}
export interface AgentOsFlowReport {
  flowId: string
  title?: string
  status: AgentOsFlowStatus
  summary?: string
  proposedBy?: string
  steps: AgentOsFlowReportStep[]
  totals: { tokens: { input: number; output: number }; toolCalls: number; added: number; seconds: number }
}

export function fetchFlowReport(flowId: string): Promise<AgentOsFlowReport> {
  return request<AgentOsFlowReport>(`/flows/${flowId}/report`)
}

export async function fetchFlows(): Promise<AgentOsFlow[]> {
  const { flows } = await request<{ flows: AgentOsFlow[] }>('/flows')
  return flows
}

/** Resumes an EXISTING flow — the gateway re-derives remaining work from
 *  the flow's persisted step statuses, so this is also how you'd retry
 *  after a step that got stuck ('lost') once reconciled. Needs the same
 *  step definitions the flow was created with (agentId/goal/dependsOn
 *  aren't persisted server-side beyond id/dependsOn/status — see
 *  agent-os's flow-engine.ts). */
export function resumeFlow(flowId: string, steps: FlowStepInput[]): Promise<AgentOsFlow> {
  return request<AgentOsFlow>(`/flows/${flowId}/resume`, { method: 'POST', body: JSON.stringify({ steps }) })
}

export function cancelFlow(flowId: string, reason?: string): Promise<AgentOsFlow> {
  return request<AgentOsFlow>(`/flows/${flowId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })
}

export interface SessionEvent {
  type: string
  payload: Record<string, unknown>
}

// ---- One shared event stream ----
//
// Every subscriber shares ONE EventSource. Browsers allow only six open
// HTTP/1.1 connections per host, and an EventSource holds one open for
// good: with one stream per subscriber (chat, work, reviews, approvals,
// events…) the Workbench used up all six, and every later request — a
// button's POST, a refresh — queued behind them and never went out. The
// shared stream carries the union of every subscriber's types; it only
// reconnects when a subscriber needs a type it doesn't carry yet, and
// closes when nobody is listening.

interface Listener {
  types: Set<string>
  onEvent: (e: SessionEvent) => void
}

const listeners = new Set<Listener>()
let shared: EventSource | null = null
let sharedTypes = new Set<string>()
let retry = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
let syncQueued = false

function wantedTypes(): Set<string> {
  const all = new Set<string>()
  for (const l of listeners) for (const t of l.types) all.add(t)
  return all
}

function openShared(types: Set<string>): void {
  shared?.close()
  sharedTypes = types
  const source = new EventSource(`${BASE}/events?types=${[...types].sort().join(',')}`)
  shared = source
  for (const type of types) {
    source.addEventListener(type, (ev) => {
      let payload: Record<string, unknown>
      try {
        payload = JSON.parse((ev as MessageEvent).data)
      } catch {
        return // ignore malformed frames
      }
      for (const l of listeners) if (l.types.has(type)) l.onEvent({ type, payload })
    })
  }
  source.onopen = () => {
    retry = 0
  }
  source.onerror = () => {
    source.close()
    if (shared !== source) return
    shared = null
    // Reconnect with backoff — don't leave the UI silently disconnected.
    clearTimeout(retryTimer)
    retryTimer = setTimeout(syncShared, Math.min(1000 * 2 ** retry++, 16000))
  }
}

/** Brings the shared stream in line with what subscribers want. Batched to
 *  the end of the tick, so a render that mounts several subscribers opens
 *  one connection, not one per mount. */
function syncShared(): void {
  syncQueued = false
  const wanted = wantedTypes()
  if (!wanted.size) {
    shared?.close()
    shared = null
    sharedTypes = new Set()
    return
  }
  const missing = [...wanted].some((t) => !sharedTypes.has(t))
  // Narrowing never reconnects: carrying a few unused types is cheaper than
  // dropping the stream every time a panel closes.
  if (!shared || missing) openShared(new Set([...sharedTypes, ...wanted]))
}

function queueSync(): void {
  if (syncQueued) return
  syncQueued = true
  setTimeout(syncShared, 0)
}

/** Forwards every gateway event of the given types to onEvent, unfiltered
 *  by session — the building block subscribeToSessionEvents (below, one
 *  session) and the activity feeds are built on. Returns a disposer. */
export function subscribeToEvents(types: string[], onEvent: (e: SessionEvent) => void): () => void {
  if (!BASE) return () => {}
  const listener: Listener = { types: new Set(types), onEvent }
  listeners.add(listener)
  queueSync()
  return () => {
    listeners.delete(listener)
    queueSync()
  }
}

const SESSION_EVENT_TYPES = [
  'agent.turn.start',
  'session.note',
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

// ---- Agent memory — "what has this agent learned" (agent-os's memory.ts,
// surfaced via its gateway routes under /agents/:id/memory). See that
// file's own header for the full model this mirrors: fast-path episodic
// writes, a deterministic dreaming pass that's the ONLY thing allowed to
// write curated memory, and an agent's own bounded "nominate, human
// approves" voice. ----

export type EpisodicKind = 'preference' | 'correction' | 'fact' | 'outcome' | 'skill-candidate'

export interface AgentOsEpisodicEntry {
  id: string
  agentId: string
  timestamp: string
  content: string
  kind: EpisodicKind
  sourceSessionId: string
  wasExplicitCorrection: boolean
  repetitionCount: number
  taskOutcome?: 'success' | 'failure'
  agentFlaggedImportant?: boolean
}

export type NominationStatus = 'pending' | 'approved' | 'rejected'

export interface AgentOsMemoryNomination {
  id: string
  agentId: string
  content: string
  kind: EpisodicKind
  sourceSessionId: string
  status: NominationStatus
  nominatedAt: string
  reviewedAt?: string
  reviewNote?: string
  resultingEpisodicEntryId?: string
}

export interface AgentOsMemoryPromotionDecision {
  episodicEntryId: string
  eligibilityScore: number
  eligible: boolean
  decision: 'promoted' | 'held'
}

export interface AgentOsDreamingPass {
  id: string
  ranAt: string
  episodicEntriesReviewed: number
  promotions: AgentOsMemoryPromotionDecision[]
}

export interface AgentOsCuratedMemory {
  /** MEMORY.md-equivalent: durable facts, procedures, environment notes. */
  content: string
  /** USER.md-equivalent: user profile/preference information. */
  userProfile: string
  lastConsolidatedAt?: string
}

export interface AgentOsMemorySummary {
  curated: AgentOsCuratedMemory
  episodicCount: number
  lastDreamingPass?: AgentOsDreamingPass
}

export function fetchAgentMemory(agentId: string): Promise<AgentOsMemorySummary> {
  return request<AgentOsMemorySummary>(`/agents/${encodeURIComponent(agentId)}/memory`)
}

export async function fetchAgentEpisodicMemory(agentId: string): Promise<AgentOsEpisodicEntry[]> {
  const { entries } = await request<{ entries: AgentOsEpisodicEntry[] }>(`/agents/${encodeURIComponent(agentId)}/memory/episodic`)
  return entries
}

export async function fetchAgentDreamingPasses(agentId: string): Promise<AgentOsDreamingPass[]> {
  const { passes } = await request<{ passes: AgentOsDreamingPass[] }>(`/agents/${encodeURIComponent(agentId)}/memory/dreaming-passes`)
  return passes
}

export async function fetchAgentMemoryNominations(agentId: string, status?: NominationStatus): Promise<AgentOsMemoryNomination[]> {
  const qs = status ? `?status=${status}` : ''
  const { nominations } = await request<{ nominations: AgentOsMemoryNomination[] }>(`/agents/${encodeURIComponent(agentId)}/memory/nominations${qs}`)
  return nominations
}

export function approveMemoryNomination(agentId: string, nominationId: string, reviewNote?: string): Promise<{ entry: AgentOsEpisodicEntry }> {
  return request(`/agents/${encodeURIComponent(agentId)}/memory/nominations/${nominationId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reviewNote }),
  })
}

export function rejectMemoryNomination(agentId: string, nominationId: string, reviewNote?: string): Promise<{ ok: true }> {
  return request(`/agents/${encodeURIComponent(agentId)}/memory/nominations/${nominationId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reviewNote }),
  })
}

// ---- File revisions — per-file undo for edit_file/write_file
// (agent-os's file-revisions.ts). A scoped-down "checkpoint" — undoes
// ONE file's mutations, not a full session rewind. ----

export interface AgentOsFileRevision {
  id: string
  path: string
  timestamp: string
  previousContent?: string
  existedBefore: boolean
  tool: 'edit_file' | 'write_file' | 'restore'
}

export async function fetchFileRevisions(path?: string): Promise<AgentOsFileRevision[]> {
  const qs = path ? `?path=${encodeURIComponent(path)}` : ''
  const { revisions } = await request<{ revisions: AgentOsFileRevision[] }>(`/files/revisions${qs}`)
  return revisions
}

export function restoreFileRevision(id: string): Promise<{ ok: true }> {
  return request(`/files/revisions/${encodeURIComponent(id)}/restore`, { method: 'POST' })
}
