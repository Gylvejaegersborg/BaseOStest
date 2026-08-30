// Harness-internal UI types — layout/state shapes that exist only in
// BaseOS (not part of the wire protocol). Per
// AGENT-HARNESS-IMPLEMENTATION-PLAN.md §25, §32-33, §66, §70.

import type { AgentRuntimeStatus, ConversationItem, Task, Automation, PermissionRequestPayload } from './protocol'

// ---- Panels (plan §25) ----

export type PanelId =
  | 'conversation'
  | 'meeting'
  | 'files'
  | 'browser'
  | 'tool'
  | 'tasks'
  | 'agents'
  | 'automations'
  | 'activity'
  | 'terminal'

// ---- Runtime agent (plan §13, §32-33) — the LIVE version of a
// registered AgentIdentity, decorated with the status this scaffold's
// event stream drives (not derived from src/data/agents.ts, which is
// seed/default data only per plan §33). ----

export interface AgentRuntime {
  id: string
  name: string
  persona: string
  color: string
  status: AgentRuntimeStatus
  currentTask?: string
}

// ---- Harness-local navigation (plan §65-66) — NOT React Router. Every
// value here stays under the single /chat route; switching between them
// is local state, not navigation. ----

export type HarnessView = 'chat' | 'team' | 'meeting' | 'files' | 'tools'

// ---- Connection state (plan §71) ----

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'

// ---- Right Rail collapse state (plan §21) ----

export type RailState = 'expanded' | 'collapsed' | 'hidden'

// ---- The Harness store shape (plan §70) — assembled incrementally;
// Phase 5 populates this with fake data, Phase 6 replaces the data
// SOURCE (not the shape) with a live WebSocket connection. ----

export interface HarnessState {
  connection: ConnectionState
  activeSessionId: string | null
  activeAgentId: string | null
  activeView: HarnessView
  agents: AgentRuntime[]
  messages: ConversationItem[]
  tasks: Task[]
  pendingPermissions: PermissionRequestPayload[]
  automations: Automation[]
  rightRail: RailState
  bottomRail: RailState
}
