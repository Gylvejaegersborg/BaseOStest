import { useState } from 'react'
import { ChevronDown, ChevronRight, Flag, Plus } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import { GOAL_STATUS_META, createGoal, useGoalViews } from './store'

const COLLAPSE_KEY = 'os:goals:stripCollapsed'

/**
 * The goals row above the project board: what the projects are for. Each
 * card shows how far its projects have come and how much is connected to
 * it; click opens the goal. Achieved and dropped goals fold away behind a
 * toggle so the row stays about what's live.
 */
export function GoalsStrip({ onOpenGoal }: { onOpenGoal: (id: string) => void }) {
  const views = useGoalViews()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [showClosed, setShowClosed] = useState(false)
  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        /* layout preference only */
      }
      return !c
    })
  }
  const active = views.filter((g) => g.status === 'active')
  const closed = views.filter((g) => g.status !== 'active')
  const shown = showClosed ? views : active

  return (
    <div className="mb-3 shrink-0">
      <div className="mb-1.5 flex items-center gap-2">
        <button onClick={toggle} className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-dim hover:text-text">
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />} Goals
          <span className="normal-case tracking-normal">· {active.length} active</span>
        </button>
        {!collapsed && closed.length > 0 && (
          <button onClick={() => setShowClosed((s) => !s)} className="text-[11px] text-dim hover:text-text">
            {showClosed ? 'Hide' : 'Show'} {closed.length} achieved/dropped
          </button>
        )}
        <button
          onClick={() => onOpenGoal(createGoal({ title: 'New goal' }))}
          className="ml-auto flex items-center gap-1 text-[11px] text-dim hover:text-accent"
          title="New goal"
        >
          <Plus size={12} /> Goal
        </button>
      </div>
      {!collapsed &&
        (shown.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {shown.map((g) => {
              const open = g.allProjects.reduce((n, p) => n + p.plans.length, 0)
              const viaSubGoals = g.allProjects.length - g.projects.length
              return (
                <button
                  key={g.id}
                  onClick={() => onOpenGoal(g.id)}
                  className={cn(
                    'w-60 shrink-0 rounded-panel border border-line bg-panel/50 p-2.5 text-left transition-colors hover:border-[#f0a020]/50',
                    g.status !== 'active' && 'opacity-60',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <StatusDot color={GOAL_STATUS_META[g.status].color} size={6} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-text">{g.title}</span>
                    {g.target && <span className="shrink-0 text-[10px] text-dim">{g.target.slice(5)}</span>}
                  </div>
                  {g.chain.length > 1 && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-dim">
                      <Flag size={9} /> {g.chain[1]!.title}
                    </p>
                  )}
                  <p className="mt-1.5 truncate text-[10px] text-dim">
                    {g.allProjects.length} project{g.allProjects.length === 1 ? '' : 's'}
                    {viaSubGoals > 0 && ` (${viaSubGoals} via sub-goals)`} · {g.notes.length + g.projectNotes.length} notes · {open} next moves
                    {g.children.length > 0 && ` · ${g.children.length} sub-goals`}
                  </p>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-[11px] text-dim">
            No goals yet. A goal is what projects are for — agents working on a project see the goal it serves and why.
          </p>
        ))}
    </div>
  )
}
