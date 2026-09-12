import { useEffect, useState } from 'react'
import { agentOsGatewayConfigured, subscribeToEvents } from './sessionClient'

export interface WorkbenchEvent {
  id: string
  type: string
  payload: Record<string, unknown>
  time: string
}

/** Every event type the workbench cares about, across the whole
 * app — turn/tool activity, session lifecycle, approvals, and Flow
 * step/completion events. One shared subscription (see AgentOsProvider)
 * feeds the Events tab, the agent rail's live status, and Flow/approval
 * badges — real runtime activity, not a simulated feed. */
const WORKBENCH_EVENT_TYPES = [
  'agent.turn.start',
  'agent.turn.end',
  'tool.call.start',
  'tool.call.end',
  'session.status.changed',
  'approval.requested',
  'approval.resolved',
  'flow.step.started',
  'flow.step.completed',
  'flow.completed',
]

const MAX_EVENTS = 60

function fmtTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}

/** Turns a raw event into one human-readable line for the Events tab (and
 * anywhere else that wants a quick summary rather than the raw payload). */
export function describeWorkbenchEvent(e: WorkbenchEvent): string {
  const p = e.payload
  switch (e.type) {
    case 'agent.turn.start': {
      const msg = String(p.userMessage ?? '')
      return `${p.agentId ?? '?'} started: "${msg.slice(0, 70)}${msg.length > 70 ? '…' : ''}"`
    }
    case 'agent.turn.end': {
      if (p.cancelled) return `${p.agentId ?? '?'}: turn cancelled`
      const content = String(p.finalContent ?? '')
      return `${p.agentId ?? '?'}: ${content.slice(0, 90)}${content.length > 90 ? '…' : ''}`
    }
    case 'tool.call.start':
      return `${p.agentId ?? '?'} running ${String(p.name ?? 'a tool')}…`
    case 'tool.call.end': {
      const result = p.result as { ok?: boolean } | undefined
      return result?.ok === false
        ? `${p.agentId ?? '?'}: ${String(p.name ?? 'tool')} failed`
        : `${p.agentId ?? '?'}: finished ${String(p.name ?? 'a tool')}`
    }
    case 'session.status.changed':
      return `session ${String(p.sessionId ?? '').slice(0, 8)} → ${p.status}`
    case 'approval.requested':
      return `${p.agentId ?? '?'} needs approval to run ${String(p.toolName ?? 'a tool')}`
    case 'approval.resolved':
      return `approval ${String(p.approvalId ?? '').slice(0, 8)} → ${p.status}`
    case 'flow.step.started':
      return `flow ${String(p.flowId ?? '').slice(0, 8)}: ${p.agentId} started step "${p.stepId}"`
    case 'flow.step.completed':
      return `flow ${String(p.flowId ?? '').slice(0, 8)}: step "${p.stepId}" → ${p.status}`
    case 'flow.completed':
      return `flow ${String(p.flowId ?? '').slice(0, 8)} → ${p.status}`
    default:
      return e.type
  }
}

/**
 * One shared, real-time log of workbench-relevant Agent-OS events — every
 * agent, every session, every Flow, unfiltered. Powers the Events tab
 * directly and gives other panels (agent rail status, Flow/approval
 * badges) a single source of live truth instead of each opening its own
 * SSE subscription. Empty (never connects) when no gateway is configured
 * — same posture as every other Agent-OS hook here.
 */
export function useAgentOsEventLog(): WorkbenchEvent[] {
  const [events, setEvents] = useState<WorkbenchEvent[]>([])

  useEffect(() => {
    if (!agentOsGatewayConfigured()) return
    const dispose = subscribeToEvents(WORKBENCH_EVENT_TYPES, (e) => {
      setEvents((prev) =>
        [{ id: `${e.type}-${Date.now()}-${Math.random()}`, type: e.type, payload: e.payload, time: fmtTime() }, ...prev].slice(
          0,
          MAX_EVENTS,
        ),
      )
    })
    return dispose
  }, [])

  return events
}
