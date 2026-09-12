import type { Agent } from '@/data/agents'
import { StatusDot } from '@/components/ui/StatusDot'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { cn } from '@/lib/cn'

const STATUS_COLOR: Record<Agent['status'], string> = {
  working: '#46d369',
  thinking: '#f0a020',
  idle: '#6b7785',
  offline: '#ff5566',
}

/**
 * The workbench's left rail — a clean, real roster list (no simulated
 * wander/bubble animation; that was MeetingRoom's canned chatter, which
 * this page retires). Selecting an agent filters the ENTIRE workbench to
 * them: their threads in the conversation pane, their Tasks/Artifacts in
 * the bottom strip — see Workbench.tsx for how selection propagates.
 */
export function AgentRail({ selectedAgentId, onSelect }: { selectedAgentId: string | null; onSelect: (id: string) => void }) {
  const { agents } = useAgentOsContext()
  // The two nyx-w* sub-agents are presentational-only (no real Agent-OS
  // identity) — see Chat.tsx's own CHAT_AGENTS filter for the same rule.
  const realAgents = agents.filter((a) => !a.id.includes('-w'))

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-r border-line bg-panel/30 lg:w-[220px]">
      <div className="border-b border-line px-3 py-2">
        <span className="label">Agents</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {realAgents.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelect(a.id)}
            className={cn(
              'flex w-full items-center gap-2 border-l-2 px-3 py-2.5 text-left transition-colors',
              a.id === selectedAgentId ? 'bg-panel-2 text-text' : 'border-transparent text-dim hover:bg-panel-2/50 hover:text-text',
            )}
            style={a.id === selectedAgentId ? { borderColor: a.color } : undefined}
          >
            <StatusDot color={STATUS_COLOR[a.status]} pulse={a.status === 'working'} size={7} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm" style={{ color: a.id === selectedAgentId ? a.color : undefined }}>
                {a.name}
              </span>
              <span className="block truncate text-[10px] text-dim">{a.role}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
