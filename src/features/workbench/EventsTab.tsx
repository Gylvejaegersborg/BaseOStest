import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { describeWorkbenchEvent } from '@/features/agentos/useAgentOsEventLog'

/**
 * The workbench's Events tab — the raw, real-time Agent-OS activity log
 * (agent turns, tool calls, approvals, flow steps), shared with the rest
 * of the workbench via AgentOsProvider so this tab adds no subscription
 * of its own. Filtered to the selected agent's own events when one is
 * chosen, same rule as Tasks/Artifacts.
 */
export function EventsTab({ agentId }: { agentId: string | null }) {
  const { events } = useAgentOsContext()
  const filtered = agentId ? events.filter((e) => e.payload.agentId === agentId) : events

  if (!filtered.length) {
    return <p className="p-3 text-xs text-dim">No events{agentId ? ' for this agent' : ''} yet.</p>
  }

  return (
    <div className="divide-y divide-line/60">
      {filtered.map((e) => (
        <div key={e.id} className="flex items-start gap-2 px-3 py-1.5 text-xs">
          <span className="shrink-0 text-[10px] text-dim">{e.time}</span>
          <span className="min-w-0 flex-1 truncate text-text/80">{describeWorkbenchEvent(e)}</span>
        </div>
      ))}
    </div>
  )
}
