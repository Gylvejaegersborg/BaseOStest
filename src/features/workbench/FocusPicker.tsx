import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, Sparkles, X } from 'lucide-react'
import { useProjects } from '@/features/projects/store'
import { goalChain, goalsForProject, useGoals } from '@/features/goals/store'
import type { AgentOsSessionFocus } from '@/features/agentos/sessionClient'
import { cn } from '@/lib/cn'

/**
 * What this thread serves — a goal or a project. The agent then gets, in
 * every turn, the chain up to the top goal plus the linked notes and open
 * todos (agent-os's focusContext), and notes/todos it adds link back here.
 * This is what makes a conversation part of the ongoing work instead of a
 * fresh start.
 */
export function FocusPicker({ focus, disabled, onChange }: {
  focus?: AgentOsSessionFocus
  disabled?: boolean
  onChange: (focus: AgentOsSessionFocus | null) => void
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const goals = useGoals()
  const projects = useProjects()

  const label = !focus
    ? null
    : focus.kind === 'goal'
      ? goals.find((g) => g.id === focus.id)?.title
      : projects.find((p) => p.id === focus.id)?.name
  // The chain, for the tooltip: project → goal → … → top goal.
  const chain = !focus
    ? []
    : focus.kind === 'goal'
      ? goalChain(goals, focus.id).map((g) => g.title)
      : [label ?? focus.id, ...goalsForProject(goals, focus.id).flatMap((g) => goalChain(goals, g.id).map((x) => x.title))]

  const pick = (f: AgentOsSessionFocus | null) => {
    setOpen(false)
    onChange(f)
  }
  const activeGoals = goals.filter((g) => g.status === 'active')
  const liveProjects = projects.filter((p) => p.status === 'active' || p.status === 'paused')

  return (
    <div className="relative min-w-[28px] max-w-[180px] shrink" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title={focus ? `Serves: ${chain.join(' → ')}` : 'Link this thread to a goal or project — the agent gets its context and why it matters'}
        className={cn(
          'flex max-w-full items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] disabled:opacity-40',
          focus ? 'border-[#f0a020]/40 text-[#f0a020]' : 'border-line text-dim hover:text-text',
        )}
      >
        {focus?.kind === 'project' ? <Sparkles size={10} /> : <Flag size={10} />}
        <span className="truncate">{focus ? (label ?? 'missing') : 'Serves…'}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-2 max-h-[60vh] w-[280px] overflow-y-auto border border-line-2 bg-panel py-1 shadow-glow animate-fade-in">
            <p className="px-3 py-1.5 text-[10px] text-dim">What does this thread serve? The agent sees the chain, linked notes and open todos.</p>
            {focus && (
              <button onClick={() => pick(null)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-dim hover:bg-panel-2/50 hover:text-text">
                <X size={11} /> No focus
              </button>
            )}
            <div className="label px-3 pb-0.5 pt-2">Goals</div>
            {activeGoals.length ? (
              activeGoals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => pick({ kind: 'goal', id: g.id })}
                  className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-panel-2/50', focus?.id === g.id ? 'text-[#f0a020]' : 'text-text')}
                >
                  <Flag size={11} className="shrink-0 text-[#f0a020]/80" />
                  <span className="truncate">{g.title}</span>
                </button>
              ))
            ) : (
              <button onClick={() => navigate('/projects')} className="px-3 py-1 text-left text-[11px] text-dim hover:text-accent">
                No goals yet — add one on Projects
              </button>
            )}
            <div className="label px-3 pb-0.5 pt-2">Projects</div>
            {liveProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => pick({ kind: 'project', id: p.id })}
                className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-panel-2/50', focus?.id === p.id ? 'text-[#f0a020]' : 'text-text')}
              >
                <Sparkles size={11} className="shrink-0 text-accent/70" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
