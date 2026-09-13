import { useState } from 'react'
import { Plus, ChevronDown, Pencil } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import type { Agent } from '@/data/agents'
import type { useAgentOsChat } from '@/features/agentos/useAgentOsChat'
import type { AgentOsSession } from '@/features/agentos/sessionClient'
import { useAgentOsSessionUsage } from '@/features/agentos/useAgentOsSessionUsage'

function fmtTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function sessionLabel(s: AgentOsSession): string {
  return s.title || new Date(s.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * The workbench's top-strip identity: which agent, which thread — replaces
 * the old standalone "Viewing X" line entirely (see Workbench.tsx). Click
 * to open the thread list (every session with this agent); unchanged
 * behavior from before, just relocated out of the conversation pane so it
 * reads as one continuous top strip instead of two stacked bars. Every row
 * in that list can be renamed in place (default titles are just a
 * formatted date/time, which stops being useful the moment you have more
 * than one or two threads going).
 */
export function ThreadHeader({ agent, chat }: { agent: Agent; chat: ReturnType<typeof useAgentOsChat> }) {
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const current = chat.sessions.find((s) => s.id === chat.sessionId)
  const usage = useAgentOsSessionUsage(chat.sessionId, chat.streaming)

  const startRename = (s: AgentOsSession) => {
    setRenamingId(s.id)
    setRenameValue(sessionLabel(s))
  }

  const commitRename = () => {
    const id = renamingId
    const title = renameValue.trim()
    setRenamingId(null)
    if (id && title) chat.rename(id, title)
  }

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
        {!!usage?.turnsWithUsage && (
          <span
            title={`${usage.inputTokens.toLocaleString()} input + ${usage.outputTokens.toLocaleString()} output tokens this thread`}
            className="shrink-0 rounded-sm bg-panel-2 px-1.5 py-0.5 text-[10px] text-dim"
          >
            {fmtTokens(usage.inputTokens + usage.outputTokens)} tok
          </span>
        )}
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
              .map((s) =>
                renamingId === s.id ? (
                  <div key={s.id} className="flex items-center gap-1 border-l-2 border-accent bg-accent/5 px-3 py-1.5">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename()
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onBlur={commitRename}
                      className="min-w-0 flex-1 border border-line bg-bg/60 px-1.5 py-1 text-xs text-text outline-none focus:border-accent/50"
                    />
                  </div>
                ) : (
                  <button
                    key={s.id}
                    onClick={() => { chat.switchSession(s.id); setOpen(false) }}
                    className={cn(
                      'group flex w-full items-center justify-between gap-2 border-l-2 px-3 py-2.5 text-left transition-colors',
                      s.id === chat.sessionId ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-panel-2/50',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-xs text-text">
                      <span className="truncate">{sessionLabel(s)}</span>
                      {s.status !== 'active' && <span className="shrink-0 text-[9px] text-dim">{s.status}</span>}
                    </span>
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); startRename(s) }}
                      title="Rename thread"
                      className="shrink-0 text-dim opacity-40 hover:text-accent group-hover:opacity-100"
                    >
                      <Pencil size={11} />
                    </span>
                  </button>
                ),
              )}
          </div>
        </>
      )}
    </div>
  )
}
