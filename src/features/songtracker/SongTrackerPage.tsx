import { useMemo, useState } from 'react'
import { Check, ChevronRight, ListChecks, Music2, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import {
  RECENT_RELEASES,
  SONG_PROJECTS,
  STAGES,
  stageIndex,
  type SongProject,
  type Task,
} from './projects'

interface SongTrackerPageProps {
  open: boolean
  onClose: () => void
}

let taskSeq = 0
function newTaskId(): string {
  taskSeq += 1
  return `t-${Date.now()}-${taskSeq}`
}

/**
 * ISΛRK Song Tracker — a daily task tracker for one artist's ongoing song
 * projects. Each song sits at a stage in the record → distribute lifecycle and
 * carries its own checklist; the Today panel pulls the day's tasks across every
 * project. Tasks are really checkable and state holds for the session.
 */
export function SongTrackerPage({ open, onClose }: SongTrackerPageProps) {
  const [projects, setProjects] = useState<SongProject[]>(SONG_PROJECTS)

  const toggleTask = (projectId: string, taskId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId
          ? p
          : { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) },
      ),
    )
  }

  const addTask = (projectId: string, label: string, today: boolean) => {
    const trimmed = label.trim()
    if (!trimmed) return
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId
          ? p
          : { ...p, tasks: [...p.tasks, { id: newTaskId(), label: trimmed, done: false, today }] },
      ),
    )
  }

  const advanceStage = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p
        const i = stageIndex(p.stage)
        if (i >= STAGES.length - 1) return p
        return { ...p, stage: STAGES[i + 1].id }
      }),
    )
  }

  const today = useMemo(
    () =>
      projects.flatMap((p) =>
        p.tasks
          .filter((t) => t.today)
          .map((t) => ({ ...t, song: p.title, projectId: p.id, accent: p.accent })),
      ),
    [projects],
  )
  const todayDone = today.filter((t) => t.done).length
  const now = new Date()
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'short' })
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg font-mono text-text">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel/70 px-3 backdrop-blur sm:px-4">
        <div className="flex shrink-0 items-center gap-2">
          <Music2 size={16} className="text-amber" />
          <span className="font-display text-sm tracking-wider text-text">ISΛRK · SONG TRACKER</span>
          <span className="hidden text-[9px] uppercase tracking-[0.2em] text-dim sm:inline">
            ongoing projects · daily focus
          </span>
        </div>
        <span className="ml-auto hidden text-[10px] tabular-nums text-dim sm:inline">
          {projects.length} songs in progress · {todayDone}/{today.length} today
        </span>
        <button onClick={onClose} aria-label="Close Song Tracker" className="shrink-0 text-dim transition-colors hover:text-text">
          <X size={18} />
        </button>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Song projects */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:overflow-y-auto">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-dim">
            <span className="font-display tracking-wider text-text">Song projects</span>
            <span className="text-dim">· {projects.length} active</span>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {projects.map((p) => (
              <SongCard
                key={p.id}
                project={p}
                onToggle={(taskId) => toggleTask(p.id, taskId)}
                onAdd={(label) => addTask(p.id, label, false)}
                onAdvance={() => advanceStage(p.id)}
              />
            ))}
          </div>

          <Released />
        </div>

        {/* Today */}
        <aside className="flex shrink-0 flex-col border-b border-line bg-panel/40 lg:w-[300px] lg:border-b-0 lg:border-l">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber">
              <ListChecks size={12} /> Today
            </span>
            <span className="text-[10px] tabular-nums text-dim">
              {weekday} · {dateStr}
            </span>
          </div>

          {/* Progress */}
          <div className="border-b border-line px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-dim">
              <span>{todayDone === today.length && today.length > 0 ? 'All done — nice.' : 'Focus for today'}</span>
              <span className="tabular-nums">{todayDone}/{today.length}</span>
            </div>
            <div className="h-1.5 w-full bg-bg">
              <div
                className="h-full bg-neon-green transition-all duration-300"
                style={{ width: today.length ? `${(todayDone / today.length) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Today's tasks */}
          <div className="flex-1 p-2 lg:min-h-0 lg:overflow-y-auto">
            {today.length === 0 && (
              <p className="px-1 py-6 text-center text-xs text-dim">No tasks flagged for today.</p>
            )}
            <div className="space-y-1">
              {today.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTask(t.projectId, t.id)}
                  className="flex w-full items-start gap-2 border border-line bg-bg/30 px-2 py-1.5 text-left transition-colors hover:border-line-2"
                >
                  <Checkbox done={t.done} accent={t.accent} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-xs leading-snug', t.done ? 'text-dim line-through' : 'text-text')}>
                      {t.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wider" style={{ color: t.accent }}>
                      {t.song}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ── Song card ──────────────────────────────────────────────────────── */

function SongCard({
  project,
  onToggle,
  onAdd,
  onAdvance,
}: {
  project: SongProject
  onToggle: (taskId: string) => void
  onAdd: (label: string) => void
  onAdvance: () => void
}) {
  const [draft, setDraft] = useState('')
  const idx = stageIndex(project.stage)
  const done = project.tasks.filter((t) => t.done).length
  const total = project.tasks.length
  const isLastStage = idx >= STAGES.length - 1

  const submit = () => {
    onAdd(draft)
    setDraft('')
  }

  return (
    <section className="flex flex-col border border-line bg-panel/60" style={{ borderColor: `${project.accent}33` }}>
      {/* Card header */}
      <div className="border-b border-line px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base tracking-wide text-text">{project.title}</h3>
          <Badge color={project.accent}>{project.stage}</Badge>
        </div>
        <div className="mt-1 flex items-center gap-3 text-[10px] tabular-nums text-dim">
          <span>{project.bpm} BPM</span>
          <span>{project.musicalKey}</span>
          <span>{done}/{total} tasks</span>
        </div>
      </div>

      {/* Stage track */}
      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        {STAGES.map((s, i) => {
          const passed = i < idx
          const current = i === idx
          const color = passed ? '#46d369' : current ? project.accent : '#2a3442'
          return (
            <div key={s.id} className="flex flex-1 flex-col items-center gap-1" title={s.label}>
              <div
                className={cn('h-1.5 w-full rounded-sm transition-all', current && 'animate-pulse-dot')}
                style={{ backgroundColor: color, boxShadow: current ? `0 0 6px ${color}` : undefined }}
              />
              <span
                className="text-[8px] uppercase tracking-wider"
                style={{ color: current ? project.accent : passed ? '#46d369' : '#6b7785' }}
              >
                {s.label.slice(0, 3)}
              </span>
            </div>
          )
        })}
      </div>

      {project.note && <p className="border-b border-line px-3 py-2 text-[11px] text-dim">{project.note}</p>}

      {/* Tasks */}
      <div className="flex-1 p-2">
        <div className="space-y-1">
          {project.tasks.map((t) => (
            <TaskRow key={t.id} task={t} accent={project.accent} onToggle={() => onToggle(t.id)} />
          ))}
        </div>

        {/* Add task */}
        <div className="mt-2 flex items-center gap-2 border border-line bg-bg/30 px-2 py-1">
          <Plus size={12} className="shrink-0 text-dim" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="add a task…"
            className="flex-1 bg-transparent text-[11px] text-text placeholder:text-dim focus:outline-none"
          />
        </div>
      </div>

      {/* Advance stage */}
      <button
        onClick={onAdvance}
        disabled={isLastStage}
        className={cn(
          'flex items-center justify-center gap-1.5 border-t border-line py-2 text-[10px] uppercase tracking-wider transition-colors',
          isLastStage ? 'cursor-default text-dim' : 'text-accent hover:bg-accent/10',
        )}
      >
        {isLastStage ? (
          <>Out for distribution</>
        ) : (
          <>
            Move to {STAGES[idx + 1].label} <ChevronRight size={12} />
          </>
        )}
      </button>
    </section>
  )
}

function TaskRow({ task, accent, onToggle }: { task: Task; accent: string; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-start gap-2 px-1 py-1 text-left transition-colors hover:bg-bg/40"
    >
      <Checkbox done={task.done} accent={accent} />
      <span className={cn('min-w-0 flex-1 text-xs leading-snug', task.done ? 'text-dim line-through' : 'text-text/90')}>
        {task.label}
      </span>
      {task.today && !task.done && <span className="mt-0.5 shrink-0 text-[9px] uppercase tracking-wider text-amber">today</span>}
    </button>
  )
}

function Checkbox({ done, accent }: { done: boolean; accent: string }) {
  return (
    <span
      className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center border transition-colors"
      style={{
        borderColor: done ? '#46d369' : `${accent}88`,
        backgroundColor: done ? '#46d36922' : 'transparent',
      }}
    >
      {done && <Check size={10} className="text-neon-green" />}
    </span>
  )
}

/* ── Recently released ──────────────────────────────────────────────── */

function Released() {
  return (
    <section className="border border-line bg-panel/40">
      <div className="border-b border-line px-3 py-2">
        <span className="text-[10px] uppercase tracking-wider text-dim">Recently released</span>
      </div>
      <div className="flex flex-wrap gap-2 p-3">
        {RECENT_RELEASES.map((r) => (
          <span key={r.id} className="flex items-center gap-1.5 border border-line bg-bg/30 px-2 py-1 text-[11px]">
            <Check size={11} className="text-neon-green" />
            <span className="text-text/90">{r.title}</span>
            <span className="text-dim">· {r.date}</span>
          </span>
        ))}
      </div>
    </section>
  )
}
