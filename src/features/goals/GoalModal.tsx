import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, FileText, Flag, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { StatusDot } from '@/components/ui/StatusDot'
import { STATUS_META } from '@/data/projects'
import { useProjects } from '@/features/projects/store'
import { useCalendar } from '@/features/calendar/CalendarContext'
import { cn } from '@/lib/cn'
import {
  GOAL_STATUS_META,
  createGoal,
  deleteGoal,
  todoLinks,
  toggleGoalProject,
  updateGoal,
  useGoalViews,
  type GoalStatus,
} from './store'

const STATUSES: GoalStatus[] = ['active', 'achieved', 'dropped']

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      {children}
    </div>
  )
}

/**
 * One goal and everything connected to it — the chain above it, its
 * projects (toggle to link), the notes that [[link]] it or its projects,
 * the open todos serving it, and its sub-goals. What agents see as "why
 * this work matters" is exactly this.
 */
export function GoalModal({ goalId, onClose, onOpenGoal, onOpenProject }: {
  goalId: string
  onClose: () => void
  onOpenGoal: (id: string) => void
  onOpenProject: (id: string) => void
}) {
  const navigate = useNavigate()
  const views = useGoalViews()
  const projects = useProjects()
  const { tasks } = useCalendar()
  const goal = views.find((g) => g.id === goalId)

  const todos = useMemo(() => {
    if (!goal) return []
    return tasks.filter((t) => {
      if (t.status === 'done') return false
      const l = todoLinks(t)
      return l.goalId === goal.id || (l.projectId != null && goal.projectIds.includes(l.projectId))
    })
  }, [tasks, goal])

  if (!goal) return null
  // A goal can't sit under itself or one of its own descendants.
  const descendants = new Set<string>()
  const walk = (id: string) => views.filter((g) => g.parentId === id).forEach((c) => !descendants.has(c.id) && (descendants.add(c.id), walk(c.id)))
  walk(goal.id)
  const parentOptions = views.filter((g) => g.id !== goal.id && !descendants.has(g.id))
  const openNote = (id: string) => navigate(`/notes?note=${encodeURIComponent(id)}`)

  return (
    <Modal open onClose={onClose} title="Goal" code="GL.01" accent="#f0a020" width={900}>
      <div className="grid gap-5 font-read md:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-4">
          {goal.chain.length > 1 && (
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-dim">
              {[...goal.chain].reverse().slice(0, -1).map((g) => (
                <button key={g.id} onClick={() => onOpenGoal(g.id)} className="hover:text-accent">
                  {g.title} ›
                </button>
              ))}
            </div>
          )}
          <input
            key={`${goal.id}:${goal.title}`}
            defaultValue={goal.title}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            onBlur={(e) => e.currentTarget.value.trim() && e.currentTarget.value !== goal.title && updateGoal(goal.id, { title: e.currentTarget.value.trim() })}
            className="w-full rounded-control border border-transparent bg-transparent px-1 py-0.5 text-xl font-semibold text-text outline-none hover:border-line focus:border-accent/50"
          />
          <textarea
            key={`${goal.id}:why`}
            defaultValue={goal.why}
            placeholder="Why does this matter? Agents see this as the reason behind every task that serves it."
            rows={3}
            onBlur={(e) => e.currentTarget.value !== goal.why && updateGoal(goal.id, { why: e.currentTarget.value })}
            className="w-full resize-y rounded-control border border-line/60 bg-bg/30 px-2 py-1.5 text-[13px] leading-relaxed text-text/90 outline-none placeholder:text-dim focus:border-accent/50"
          />

          <Section label={`Projects serving it · ${goal.projects.length}`}>
            <div className="space-y-0.5">
              {projects.map((p) => {
                const on = goal.projectIds.includes(p.id)
                return (
                  <div key={p.id} className={cn('flex items-center gap-2 rounded-control px-1 py-0.5', on ? 'text-text' : 'text-dim')}>
                    <input type="checkbox" checked={on} onChange={() => toggleGoalProject(goal.id, p.id)} className="accent-[#c77591]" />
                    <button onClick={() => onOpenProject(p.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[13px] hover:text-accent">
                      <StatusDot color={STATUS_META[p.status].color} size={5} />
                      <span className="truncate">{p.name}</span>
                    </button>
                    {on && <span className="shrink-0 text-[11px] text-dim">{p.status === 'shipped' ? 100 : p.progress}%</span>}
                  </div>
                )
              })}
            </div>
          </Section>

          <Section label={`Open todos · ${todos.length}`}>
            {todos.length ? (
              <div className="space-y-0.5">
                {todos.slice(0, 20).map((t) => (
                  <button key={t.id} onClick={() => navigate('/calendar')} className="flex w-full items-center gap-1.5 rounded-control px-1 py-0.5 text-left text-[13px] hover:bg-panel-2">
                    <CheckSquare size={12} className="shrink-0 text-dim" />
                    <span className="min-w-0 flex-1 truncate text-text/85">{t.title}</span>
                    <span className="shrink-0 text-[10px] text-dim">{t.source === 'project' ? 'next move' : t.priority}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-dim">Nothing open. Todos serving it or its projects show here — a project&apos;s next moves count.</p>
            )}
          </Section>
        </div>

        <aside className="space-y-4 text-[12px]">
          <Section label="Status">
            <div className="flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => updateGoal(goal.id, { status: s })}
                  className={cn('flex items-center gap-1 rounded-control border px-2 py-1 text-[11px] uppercase tracking-wider', goal.status === s ? '' : 'border-line text-dim hover:text-text')}
                  style={goal.status === s ? { borderColor: `${GOAL_STATUS_META[s].color}88`, color: GOAL_STATUS_META[s].color } : undefined}
                >
                  <StatusDot color={GOAL_STATUS_META[s].color} size={5} />
                  {GOAL_STATUS_META[s].label}
                </button>
              ))}
            </div>
          </Section>
          <Section label="Target date">
            <input
              type="date"
              value={goal.target ?? ''}
              onChange={(e) => updateGoal(goal.id, { target: e.target.value || undefined })}
              className="w-full rounded-control border border-line bg-bg px-2 py-1 text-[12px] text-text focus:border-accent/60 focus:outline-none"
            />
          </Section>
          <Section label="Serves">
            <select
              value={goal.parentId ?? ''}
              onChange={(e) => updateGoal(goal.id, { parentId: e.target.value || undefined })}
              className="w-full rounded-control border border-line bg-bg px-2 py-1 text-[12px] text-text focus:border-accent/60 focus:outline-none"
            >
              <option value="">— a top-level goal</option>
              {parentOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </Section>
          <Section label="Progress">
            {goal.progress == null ? (
              <p className="text-dim">Link projects to track it.</p>
            ) : (
              <div className="space-y-1">
                <div className="h-1 w-full bg-line">
                  <div className="h-1 bg-[#f0a020]" style={{ width: `${goal.progress}%` }} />
                </div>
                <p className="text-dim">
                  {goal.progress}% — average of {goal.allProjects.length} project{goal.allProjects.length === 1 ? '' : 's'}
                  {goal.allProjects.length > goal.projects.length && ', including its sub-goals’'}
                </p>
              </div>
            )}
          </Section>
          <Section label={`Sub-goals · ${goal.children.length}`}>
            <div className="space-y-0.5">
              {goal.children.map((c) => (
                <button key={c.id} onClick={() => onOpenGoal(c.id)} className="flex w-full items-center gap-1.5 rounded-control px-1 py-0.5 text-left hover:bg-panel-2">
                  <Flag size={12} className="shrink-0 text-[#f0a020]/80" />
                  <span className="min-w-0 flex-1 truncate text-text/85">{c.title}</span>
                </button>
              ))}
              <button
                onClick={() => onOpenGoal(createGoal({ title: 'New sub-goal', parentId: goal.id }))}
                className="flex items-center gap-1 px-1 py-0.5 text-[11px] text-dim hover:text-accent"
              >
                <Plus size={11} /> Add sub-goal
              </button>
            </div>
          </Section>
          <Section label="Notes">
            {goal.notes.length + goal.projectNotes.length ? (
              <div className="space-y-0.5">
                {goal.notes.map((n) => (
                  <button key={n.id} onClick={() => openNote(n.id)} className="flex w-full items-center gap-1.5 rounded-control px-1 py-0.5 text-left hover:bg-panel-2">
                    <FileText size={12} className="shrink-0 text-dim" />
                    <span className="min-w-0 flex-1 truncate text-text/85">{n.title}</span>
                    <span className="shrink-0 text-[10px] text-dim">links here</span>
                  </button>
                ))}
                {goal.projectNotes.map(({ note, via }) => (
                  <button key={`${note.id}:${via.id}`} onClick={() => openNote(note.id)} className="flex w-full items-center gap-1.5 rounded-control px-1 py-0.5 text-left hover:bg-panel-2">
                    <FileText size={12} className="shrink-0 text-dim" />
                    <span className="min-w-0 flex-1 truncate text-text/85">{note.title}</span>
                    <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-dim">
                      <Sparkles size={9} /> {via.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-dim">
                Write <code className="text-text">[[{goal.title}]]</code> in a note to link it here.
              </p>
            )}
          </Section>
          <button
            onClick={() => {
              if (!window.confirm(`Delete the goal "${goal.title}"? Its projects, notes and todos stay; sub-goals move up.`)) return
              deleteGoal(goal.id)
              onClose()
            }}
            className="flex items-center gap-1.5 border-t border-line pt-3 text-[11px] text-dim hover:text-danger"
          >
            <Trash2 size={12} /> Delete goal
          </button>
        </aside>
      </div>
    </Modal>
  )
}
