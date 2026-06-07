import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  KIND_COLOR,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '@/data/calendar'
import { Panel } from '@/components/ui/Panel'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { offsetDate, hhmm, parseHM } from './util'
import { DateField } from './DateField'
import { format } from 'date-fns'

const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'To do', doing: 'Doing', done: 'Done' }

interface TaskPanelProps {
  tasks: Task[]
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onAdd: () => void
}

export function TaskPanel({ tasks, onToggle, onEdit, onAdd }: TaskPanelProps) {
  const [showDone, setShowDone] = useState(false)
  const open = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')
  const doneCount = done.length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  // Sort: overdue/high priority first, then by due day.
  const sorted = [...open].sort((a, b) => {
    const order: Record<TaskPriority, number> = { high: 0, med: 1, low: 2 }
    if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority]
    return (a.dayOffset ?? 99) - (b.dayOffset ?? 99)
  })

  return (
    <Panel
      title="Tasks"
      code="TODO"
      accent="#46d369"
      bodyClassName="p-2"
      right={
        <button onClick={onAdd} className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-dim hover:text-text">
          <Plus size={12} /> Add
        </button>
      }
    >
      <div className="mb-2 px-1">
        <div className="mb-1 flex items-center justify-between text-[10px] text-dim">
          <span>
            {doneCount}/{tasks.length} done
          </span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden bg-bg/60">
          <div className="h-full bg-neon-green transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-1.5">
        {sorted.length ? (
          sorted.map((t) => <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} onEdit={() => onEdit(t)} />)
        ) : (
          <div className="px-2 py-3 text-xs text-dim">All clear. Nice.</div>
        )}
      </div>

      {doneCount > 0 && (
        <>
          <button
            onClick={() => setShowDone((v) => !v)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 border border-line px-2 py-1.5 text-[10px] uppercase tracking-wider text-dim hover:text-text"
          >
            {showDone ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {showDone ? 'Hide' : 'Show'} done ({doneCount})
          </button>
          {showDone && (
            <div className="mt-1.5 space-y-1.5">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} onEdit={() => onEdit(t)} />
              ))}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

function dueLabel(t: Task): string | null {
  if (t.dayOffset == null) return null
  const overdue = t.dayOffset < 0
  const day =
    t.dayOffset === 0 ? 'Today' : t.dayOffset === 1 ? 'Tomorrow' : overdue ? 'Overdue' : format(offsetDate(t.dayOffset), 'EEE')
  return t.dueTime != null && !overdue ? `${day} · ${hhmm(t.dueTime)}` : day
}

function TaskRow({ task, onToggle, onEdit }: { task: Task; onToggle: () => void; onEdit: () => void }) {
  const color = PRIORITY_COLOR[task.priority]
  const subDone = task.subtasks?.filter((s) => s.done).length ?? 0
  const subTotal = task.subtasks?.length ?? 0
  const overdue = (task.dayOffset ?? 0) < 0
  const label = dueLabel(task)

  return (
    <div
      className="flex items-start gap-2 border-l-2 bg-bg/40 px-2 py-2 hover:bg-panel-2/60"
      style={{ borderColor: color }}
    >
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 size-3.5 shrink-0 accent-neon-green"
      />
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className={cn('truncate text-xs', task.status === 'done' ? 'text-dim line-through' : 'text-text')}>
          {task.title}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
          <span style={{ color }}>{PRIORITY_LABEL[task.priority]}</span>
          {label && <span className={overdue ? 'text-danger' : 'text-dim'}>{label}</span>}
          {task.status === 'doing' && <span className="text-accent">{STATUS_LABEL.doing}</span>}
          {subTotal > 0 && (
            <span className="text-dim">
              {subDone}/{subTotal} sub
            </span>
          )}
        </div>
      </button>
    </div>
  )
}

// ─── Editor ─────────────────────────────────────────────────────────────────

const PRIORITIES: TaskPriority[] = ['high', 'med', 'low']
const STATUSES: TaskStatus[] = ['todo', 'doing', 'done']

export function TaskModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task | null
  onClose: () => void
  onSave: (t: Task) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState<Task | null>(task)
  if (task && (!draft || draft.id !== task.id)) setDraft(task)
  if (!task || !draft) return null
  const color = PRIORITY_COLOR[draft.priority]

  const set = (patch: Partial<Task>) => setDraft({ ...draft, ...patch })

  return (
    <Modal open={!!task} onClose={onClose} title="Task" code={draft.id.startsWith('new') ? 'NEW' : draft.id.toUpperCase()} accent={color} width={460}>
      <label className="label mb-1 block">Title</label>
      <input
        value={draft.title}
        autoFocus
        onChange={(e) => set({ title: e.target.value })}
        placeholder="What needs doing?"
        className="mb-3 w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      />

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="label mb-1 block">Priority</label>
          <select
            value={draft.priority}
            onChange={(e) => set({ priority: e.target.value as TaskPriority })}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label mb-1 block">Status</label>
          <select
            value={draft.status}
            onChange={(e) => set({ status: e.target.value as TaskStatus })}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="label mb-1 block">Due date</label>
        <DateField value={draft.dayOffset} onChange={(d) => set({ dayOffset: d })} allowEmpty className="w-full" />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="label mb-1 block">Time</label>
          <input
            type="time"
            value={draft.dueTime != null ? hhmm(draft.dueTime) : ''}
            onChange={(e) => set({ dueTime: e.target.value === '' ? undefined : (parseHM(e.target.value) ?? undefined) })}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="label mb-1 block">Remind</label>
          <select
            value={draft.reminderMinutes ?? 15}
            onChange={(e) => set({ reminderMinutes: Number(e.target.value) })}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          >
            {[5, 10, 15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m}m before
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="label mb-1 block">Tag</label>
      <select
        value={draft.kind ?? ''}
        onChange={(e) => set({ kind: (e.target.value || undefined) as Task['kind'] })}
        className="mb-3 w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      >
        <option value="">none</option>
        {Object.keys(KIND_COLOR).map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>

      <label className="label mb-1 block">Notes</label>
      <textarea
        value={draft.notes ?? ''}
        onChange={(e) => set({ notes: e.target.value })}
        rows={2}
        className="mb-3 w-full resize-none border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      />

      {draft.subtasks && draft.subtasks.length > 0 && (
        <div className="mb-4">
          <label className="label mb-1 block">Subtasks</label>
          <div className="space-y-1">
            {draft.subtasks.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={() =>
                    set({
                      subtasks: draft.subtasks!.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)),
                    })
                  }
                  className="size-3.5 accent-neon-green"
                />
                <span className={cn(s.done && 'text-dim line-through')}>{s.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-dim">
        {!draft.id.startsWith('new') ? (
          <button
            onClick={() => onDelete(draft.id)}
            className="flex items-center gap-1 border border-line px-2 py-1.5 uppercase tracking-wider hover:text-danger"
          >
            <Trash2 size={12} /> Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="border border-line px-3 py-1.5 uppercase tracking-wider hover:text-text">
            Cancel
          </button>
          <button
            onClick={() => draft.title.trim() && onSave(draft)}
            className="border px-3 py-1.5 uppercase tracking-wider disabled:opacity-40"
            style={{ borderColor: `${color}66`, color }}
            disabled={!draft.title.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
