// Harness wire protocol — the TypeScript mirror of agent-os's
// src/harness/protocol.ts. Kept in sync by hand for now (no shared
// package between the two repos yet); the discriminated unions and every
// field name here MUST match agent-os's protocol.ts exactly, since this
// is the actual wire contract BaseOS and agent-os communicate over.
//
// Phase 5 (this file + the Harness shell components) uses ONLY fake data
// built from these types — no WebSocket client exists yet (that's
// Phase 6). Building the types first and the fake-data layer against
// them means Phase 6 only has to swap the DATA SOURCE, not the shapes
// every component already renders.

export const HARNESS_PROTOCOL_VERSION = 1

// ---- Shared primitive shapes (mirrors agent-os's core/types.ts) ----

export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'timed_out' | 'cancelled' | 'lost'

export interface Task {
  id: string
  type: 'subagent' | 'cron' | 'cli' | 'user-request' | 'flow-step'
  agentId: string
  workerId?: string
  parentTaskId?: string
  flowId?: string
  status: TaskStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  notifyPolicy: 'immediate' | 'digest' | 'silent'
  timeoutMs?: number
}

export type AutomationTrigger =
  | { kind: 'cron'; expr: string }
  | { kind: 'event'; eventType: string; filter?: Record<string, unknown> }
  | { kind: 'webhook'; path: string }

export interface Automation {
  id: string
  trigger: AutomationTrigger
  agentId: string
  promptTemplate: string
  enabled: boolean
}

export interface AgentIdentity {
  id: string
  name: string
  persona: string
  createdAt: string
  updatedAt: string
}

export interface WorkerResult {
  ok: boolean
  output: string
  error?: string
}

export interface HarnessEventBase {
  id: string
  type: string
  timestamp: string
  sessionId?: string
  agentId?: string
  taskId?: string
}

export type AgentRuntimeStatus = 'idle' | 'thinking' | 'working' | 'waiting' | 'blocked' | 'completed' | 'error'

// ---- Conversation item vocabulary (mirrors agent-os's protocol.ts) ----

export type ConversationItemKind =
  | 'user-message'
  | 'agent-message'
  | 'tool-call'
  | 'tool-result'
  | 'permission-request'
  | 'task-update'
  | 'system-event'

interface ConversationItemBase {
  id: string
  timestamp: string
  sessionId: string
  agentId?: string
}

export interface UserMessageItem extends ConversationItemBase {
  kind: 'user-message'
  text: string
}

export interface AgentMessageItem extends ConversationItemBase {
  kind: 'agent-message'
  text: string
}

export interface ToolCallItem extends ConversationItemBase {
  kind: 'tool-call'
  tool: string
  args: Record<string, unknown>
}

export interface ToolResultItem extends ConversationItemBase {
  kind: 'tool-result'
  tool?: string
  ok: boolean
  output: string
  error?: string
}

export interface PermissionItem extends ConversationItemBase {
  kind: 'permission-request'
  request: PermissionRequestPayload
}

export interface TaskItem extends ConversationItemBase {
  kind: 'task-update'
  task: Task
}

export interface SystemEventItem extends ConversationItemBase {
  kind: 'system-event'
  text: string
}

export type ConversationItem =
  | UserMessageItem
  | AgentMessageItem
  | ToolCallItem
  | ToolResultItem
  | PermissionItem
  | TaskItem
  | SystemEventItem

// ---- Tool rendering vocabulary ----

export type ToolRenderer = 'text' | 'diff' | 'file' | 'terminal' | 'browser' | 'image' | 'json'

// ---- Permission vocabulary ----

export type PermissionRisk = 'low' | 'medium' | 'high'
export type PermissionDecision = 'allow_once' | 'allow_always' | 'deny'

export interface PermissionRequestPayload {
  requestId: string
  tool: string
  payload: Record<string, unknown>
  risk: PermissionRisk
  options: Array<'once' | 'always' | 'deny'>
}

// =====================================================================
// SERVER -> CLIENT (events) — mirrors agent-os's HarnessServerEvent
// =====================================================================

export interface HarnessReadyEvent extends HarnessEventBase {
  type: 'harness.ready'
  payload: { version: number; capabilities: string[] }
}

export interface SessionCreatedEvent extends HarnessEventBase {
  type: 'session.created'
  sessionId: string
  payload: { agentId: string }
}

export interface SessionStateEvent extends HarnessEventBase {
  type: 'session.state'
  sessionId: string
  payload: {
    messages: ConversationItem[]
    tasks: Task[]
    pendingPermissions: PermissionRequestPayload[]
  }
}

export interface AgentStatusEvent extends HarnessEventBase {
  type: 'agent.status'
  agentId: string
  payload: { status: AgentRuntimeStatus; detail?: string }
}

export interface MessageStartEvent extends HarnessEventBase {
  type: 'agent.message.start'
  sessionId: string
  agentId: string
  payload: { messageId: string }
}

export interface MessageDeltaEvent extends HarnessEventBase {
  type: 'agent.message.delta'
  sessionId: string
  agentId: string
  payload: { messageId: string; delta: string }
}

export interface MessageEndEvent extends HarnessEventBase {
  type: 'agent.message.end'
  sessionId: string
  agentId: string
  payload: { messageId: string; finalContent: string; toolCalled?: string }
}

export interface ToolStartEvent extends HarnessEventBase {
  type: 'tool.started'
  sessionId: string
  agentId: string
  payload: { tool: string; args: Record<string, unknown>; renderer: ToolRenderer }
}

export interface ToolOutputEvent extends HarnessEventBase {
  type: 'tool.output'
  sessionId: string
  agentId: string
  payload: { tool: string; chunk: string }
}

export interface ToolEndEvent extends HarnessEventBase {
  type: 'tool.ended'
  sessionId: string
  agentId: string
  payload: { tool: string; result: WorkerResult }
}

export interface PermissionRequestEvent extends HarnessEventBase {
  type: 'permission.request'
  sessionId: string
  agentId: string
  payload: PermissionRequestPayload
}

export interface PermissionResolvedEvent extends HarnessEventBase {
  type: 'permission.resolved'
  sessionId: string
  payload: { requestId: string; decision: PermissionDecision }
}

export interface TaskEvent extends HarnessEventBase {
  type: 'task.created' | 'task.updated'
  taskId: string
  payload: { task: Task; progress?: number }
}

export interface AutomationEvent extends HarnessEventBase {
  type: 'automation.started' | 'automation.completed' | 'automation.failed'
  payload: { automation: Automation; taskId?: string; error?: string }
}

export interface AutomationsSnapshotEvent extends HarnessEventBase {
  type: 'automations.snapshot'
  payload: { automations: Automation[] }
}

export interface WorkspaceEvent extends HarnessEventBase {
  type: 'workspace.document.created' | 'workspace.document.updated' | 'workspace.document.deleted' | 'workspace.conflict'
  payload: {
    documentId: string
    content?: string
    version?: number
    updatedBy?: string
    expectedVersion?: number
    currentVersion?: number
  }
}

export interface TerminalOutputEvent extends HarnessEventBase {
  type: 'terminal.output'
  payload: { terminalId: string; chunk: string }
}

export interface TerminalClosedEvent extends HarnessEventBase {
  type: 'terminal.closed'
  payload: { terminalId: string; exitCode: number | null }
}

export interface ErrorEvent extends HarnessEventBase {
  type: 'harness.error'
  payload: { code: string; message: string; recoverable: boolean; requestId?: string }
}

export type HarnessServerEvent =
  | HarnessReadyEvent
  | SessionCreatedEvent
  | SessionStateEvent
  | AgentStatusEvent
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageEndEvent
  | ToolStartEvent
  | ToolOutputEvent
  | ToolEndEvent
  | PermissionRequestEvent
  | PermissionResolvedEvent
  | TaskEvent
  | AutomationEvent
  | AutomationsSnapshotEvent
  | WorkspaceEvent
  | TerminalOutputEvent
  | TerminalClosedEvent
  | ErrorEvent

// =====================================================================
// CLIENT -> SERVER (commands) — mirrors agent-os's HarnessClientEvent
// =====================================================================

export interface HelloCommand {
  type: 'hello'
  client: string
  version: number
}

export interface CreateSessionCommand {
  type: 'session.create'
  agentId: string
}

export interface SubscribeSessionCommand {
  type: 'session.subscribe'
  sessionId: string
}

export interface SyncSessionCommand {
  type: 'session.sync'
  sessionId: string
}

export interface SendMessageCommand {
  type: 'send.message'
  sessionId: string
  agentId: string
  text: string
}

export interface CancelTurnCommand {
  type: 'turn.cancel'
  sessionId: string
}

export interface ResolvePermissionCommand {
  type: 'permission.resolve'
  requestId: string
  decision: PermissionDecision
}

export interface CreateTaskCommand {
  type: 'task.create'
  agentId: string
  input: Record<string, unknown>
}

export interface CancelTaskCommand {
  type: 'task.cancel'
  taskId: string
}

export interface RetryTaskCommand {
  type: 'task.retry'
  taskId: string
}

export interface ListAutomationsCommand {
  type: 'automations.list'
}

export interface CreateAutomationCommand {
  type: 'automations.create'
  automation: Omit<Automation, 'id'>
}

export interface SetAutomationEnabledCommand {
  type: 'automations.setEnabled'
  automationId: string
  enabled: boolean
}

export interface RunAutomationCommand {
  type: 'automations.run'
  automationId: string
}

export interface TerminalCreateCommand {
  type: 'terminal.create'
  cols: number
  rows: number
}

export interface TerminalInputCommand {
  type: 'terminal.input'
  terminalId: string
  data: string
}

export interface TerminalResizeCommand {
  type: 'terminal.resize'
  terminalId: string
  cols: number
  rows: number
}

export interface TerminalCloseCommand {
  type: 'terminal.close'
  terminalId: string
}

export interface WorkspaceUpdateCommand {
  type: 'workspace.update'
  documentId: string
  content: string
  expectedVersion: number
}

export interface SetAgentCommand {
  type: 'agent.set'
  sessionId: string
  agentId: string
}

export type HarnessClientEvent =
  | HelloCommand
  | CreateSessionCommand
  | SubscribeSessionCommand
  | SyncSessionCommand
  | SendMessageCommand
  | CancelTurnCommand
  | ResolvePermissionCommand
  | CreateTaskCommand
  | CancelTaskCommand
  | RetryTaskCommand
  | ListAutomationsCommand
  | CreateAutomationCommand
  | SetAutomationEnabledCommand
  | RunAutomationCommand
  | TerminalCreateCommand
  | TerminalInputCommand
  | TerminalResizeCommand
  | TerminalCloseCommand
  | WorkspaceUpdateCommand
  | SetAgentCommand
