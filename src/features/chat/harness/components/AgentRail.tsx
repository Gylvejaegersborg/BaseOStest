import { useHarness } from '../state/harnessStore'
import { AgentBadge } from './AgentBadge'

export function AgentRail() {
  const { state } = useHarness()
  return (
    <div className="space-y-2 p-3">
      <div className="text-[10px] uppercase tracking-wider text-dim">Agents</div>
      {state.agents.map((agent) => (
        <div key={agent.id} className="rounded border border-line bg-panel-2 px-2.5 py-2">
          <AgentBadge agent={agent} />
          {agent.currentTask && <div className="mt-1 truncate text-[10px] text-dim">{agent.currentTask}</div>}
        </div>
      ))}
    </div>
  )
}
