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

export interface AgentOsAgent {
  id: string
  name: string
  persona: string
  role?: string
  capabilities: string[]
  defaultModel?: string
  status: AgentOsStatus
  currentSessionId?: string
  currentTaskId?: string
  workerId?: string
  metrics: AgentOsMetrics
  createdAt: string
  updatedAt: string
}

export type AgentOsConnection = 'connecting' | 'live' | 'mock' | 'error'
