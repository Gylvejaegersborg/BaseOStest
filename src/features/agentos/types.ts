// Mirrors Agent-OS's AgentRecord shape (agent-os/src/core/agents.ts) —
// the authoritative agent record a running Agent-OS gateway serves at
// GET /agents. Kept as a plain structural type here (no shared package
// between the two repos yet) — see client.ts's header for why BaseOS
// treats this as an external contract rather than importing it directly.

export type AgentOsStatus = 'active' | 'idle'

export interface AgentOsMetrics {
  tasks: { total: number; successRate: number | null; failureRate: number | null }
  turnLatency: { sampleCount: number; avgMs: number | null }
  /** Absent on gateways older than the usage metrics. */
  usage?: { turns: number; turnsWithUsage: number; inputTokens: number; outputTokens: number; lastTurnAt: string | null }
}

/** Board controls for one agent (agent-os's controls.ts): pause state and
 *  a token budget per period. `blocked` says why a new turn would be refused. */
export interface AgentOsControl {
  agentId: string
  paused?: { reason: string; by?: string; at: string }
  budget?: { period: 'day' | 'week' | 'month'; limitTokens: number; warnAt: number }
  usedTokens: number
  period: 'day' | 'week' | 'month'
  periodStart: string
  blocked?: 'paused' | 'budget'
}

export interface AgentOsAgent {
  id: string
  name: string
  persona: string
  role?: string
  capabilities: string[]
  defaultModel?: string
  status: AgentOsStatus
  /** Absent on gateways older than board controls. */
  control?: AgentOsControl
  currentSessionId?: string
  currentTaskId?: string
  workerId?: string
  metrics: AgentOsMetrics
  createdAt: string
  updatedAt: string
}

export type AgentOsConnection = 'connecting' | 'live' | 'mock' | 'error'
