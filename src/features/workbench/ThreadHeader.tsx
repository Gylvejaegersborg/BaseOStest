import { useState } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import type { Agent } from '@/data/agents'
import type { useAgentOsChat } from '@/features/agentos/useAgentOsChat'
import type { AgentOsSession } from '@/features/agentos/sessionClient'

function sessionLabel(s: AgentOsSession): string {
  return s.title || new Date(s.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * The workbench's top-strip identity: which agent, which thread — replaces
 * the old standalone "Viewing X" line entirely (see Workbench.tsx). Click
 * to open the thread list (every session with this agent); unchanged
 * behavior from before, just relocated out of the conversation pane so it
 * reads as one continuous top strip instead of two stacked bars.
 */
export function ThreadHeader({ agent, chat }: { agent: Agent; chat: ReturnType<typeof useAgentOsChat> }) {
  const [open, setOpen] = useState(false)
  const current = chat.sessions.find((s) => s.id === chat.sessionId)

  return (
    <div className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o) } }}
        className="flex min-w-0 cursor-pointer items-center gap-2"
      >
        <StatusDot color={agent.color} size={7} />
        <span className="font-display text-sm tracking-wider" style={{ color: agent.color }}>{agent.name}</span>
        <span className="min-w-0 max-w-[220px] truncate text-xs text-dim">{current ? sessionLabel(current) : 'New chat'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); chat.newSession() }}
          disabled={chat.connection !== 'ready'}
          title="New thread"
          className="text-dim hover:text-accent disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
        <ChevronDown size={14} className={cn('shrink-0 text-dim transition-transform', open && 'rotate-180')} />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-2 max-h-[60vh] w-[280px] overflow-y-auto border border-line-2 bg-panel shadow-glow animate-fade-in">
            {!chat.sessions.length && <p className="px-3 py-4 text-center text-[11px] text-dim">No threads yet.</p>}
            {[...chat.sessions]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => { chat.switchSession(s.id); setOpen(false) }}
                  className={cn(
                    'flex w-full flex-col gap-0.5 border-l-2 px-3 py-2.5 text-left transition-colors',
                    s.id === chat.sessionId ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-panel-2/50',
                  )}
                >
                  <span className="flex items-center justify-between text-xs text-text">
                    <span className="truncate">{sessionLabel(s)}</span>
                    {s.status !== 'active' && <span className="text-[9px] text-dim">{s.status}</span>}
                  </span>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
