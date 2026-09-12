import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import type { Agent } from '@/data/agents'
import { StatusDot } from '@/components/ui/StatusDot'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { fetchAgent } from '@/features/agentos/client'
import { AgentEditorModal } from './AgentEditorModal'
import { cn } from '@/lib/cn'

const STATUS_COLOR: Record<Agent['status'], string> = {
  working: '#46d369',
  thinking: '#f0a020',
  idle: '#6b7785',
  offline: '#ff5566',
}

interface EditTarget {
  id: string
  name: string
  persona: string
  role: string
  capabilities: string[]
  defaultModel?: string
}

/**
 * The workbench's left rail — a clean, real roster list (no simulated
 * wander/bubble animation; that was MeetingRoom's canned chatter, which
 * this page retires). Selecting an agent filters the ENTIRE workbench to
 * them: their threads in the conversation pane, their Tasks/Artifacts in
 * the right panel — see Workbench.tsx for how selection propagates.
 * Also where agents get created/edited (POST/PUT /agents on the gateway).
 */
export function AgentRail({ selectedAgentId, onSelect }: { selectedAgentId: string | null; onSelect: (id: string) => void }) {
  const { agents, connection } = useAgentOsContext()
  const [editing, setEditing] = useState<EditTarget | null | 'new'>(null)
  // The two nyx-w* sub-agents are presentational-only (no real Agent-OS
  // identity) — see Chat.tsx's own CHAT_AGENTS filter for the same rule.
  const realAgents = agents.filter((a) => !a.id.includes('-w'))

  const openEdit = async (id: string) => {
    try {
      const remote = await fetchAgent(id)
      setEditing({ id: remote.id, name: remote.name, persona: remote.persona, role: remote.role ?? '', capabilities: remote.capabilities })
    } catch {
      // Not a real Agent-OS identity yet (e.g. gateway unreachable, or this
      // id only exists in the bundled presentational roster) — nothing to edit.
    }
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-r border-line bg-panel/30 lg:w-[220px]">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="label">Agents</span>
        <button
          onClick={() => setEditing('new')}
          disabled={connection !== 'live'}
          title={connection === 'live' ? 'New agent' : 'Connect an Agent-OS gateway to create agents'}
          className="text-dim hover:text-accent disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {realAgents.map((a) => (
          <div
            key={a.id}
            className={cn(
              'group flex w-full items-center gap-2 border-l-2 px-3 py-2.5 transition-colors',
              a.id === selectedAgentId ? 'bg-panel-2 text-text' : 'border-transparent text-dim hover:bg-panel-2/50 hover:text-text',
            )}
            style={a.id === selectedAgentId ? { borderColor: a.color } : undefined}
          >
            <button onClick={() => onSelect(a.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <StatusDot color={STATUS_COLOR[a.status]} pulse={a.status === 'working'} size={7} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm" style={{ color: a.id === selectedAgentId ? a.color : undefined }}>
                  {a.name}
                </span>
                <span className="block truncate text-[10px] text-dim">{a.role}</span>
              </span>
            </button>
            {connection === 'live' && (
              <button
                onClick={() => openEdit(a.id)}
                title={`Edit ${a.name}`}
                className="shrink-0 text-dim opacity-0 hover:text-accent group-hover:opacity-100"
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <AgentEditorModal
        open={editing !== null}
        target={editing === 'new' || editing === null ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={onSelect}
      />
    </aside>
  )
}
