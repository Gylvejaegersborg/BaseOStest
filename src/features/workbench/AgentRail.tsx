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

  // Opens immediately with best-effort local data (never a dead click,
  // even if the gateway turns out to be unreachable) and upgrades to the
  // live record when fetchAgent succeeds. If it doesn't, the modal is
  // still open and its own save attempt surfaces a real error — silently
  // refusing to open at all (the old behavior) looked identical to a
  // broken button with no way to tell why.
  const openEdit = async (a: Agent) => {
    setEditing({ id: a.id, name: a.name, persona: '', role: a.role, capabilities: [] })
    try {
      const remote = await fetchAgent(a.id)
      setEditing({ id: remote.id, name: remote.name, persona: remote.persona, role: remote.role ?? '', capabilities: remote.capabilities })
    } catch {
      // Keep the local-data fallback already showing — see comment above.
    }
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-r border-line bg-panel/30 lg:w-[220px]">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="label">Agents</span>
        <button onClick={() => setEditing('new')} title="New agent" className="text-dim hover:text-accent">
          <Plus size={14} />
        </button>
      </div>
      {connection !== 'live' && (
        <p className="border-b border-line px-3 py-2 text-[10px] leading-relaxed text-dim">
          No live Agent-OS gateway ({connection}) — creating or editing an agent here will fail until one is
          configured (<code className="text-text/70">VITE_AGENT_OS_GATEWAY_URL</code>).
        </p>
      )}
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
            <button
              onClick={() => openEdit(a)}
              title={`Edit ${a.name}`}
              className="shrink-0 text-dim opacity-40 hover:text-accent group-hover:opacity-100"
            >
              <Pencil size={12} />
            </button>
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
