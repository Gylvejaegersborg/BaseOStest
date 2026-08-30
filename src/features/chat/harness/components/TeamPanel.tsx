import { useHarness } from '../state/harnessStore'
import { AgentBadge } from './AgentBadge'

/** Team view inside the Harness — per plan §34, uses the SAME
 *  AgentRuntime identities agent-os's Gateway will eventually stream,
 *  not a separate Team-agent model. Placeholder detail cards until
 *  agent-os identity data is live (Phase 6+). */
export function TeamPanel() {
  const { state } = useHarness()
  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      <div className="text-[10px] uppercase tracking-wider text-dim">Team</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {state.agents.map((agent) => (
          <div key={agent.id} className="rounded border border-line bg-panel-2 px-3 py-2.5">
            <AgentBadge agent={agent} />
            <div className="mt-1.5 text-xs text-dim">{agent.persona}</div>
            {agent.currentTask && <div className="mt-1 text-[10px] text-dim italic">{agent.currentTask}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
