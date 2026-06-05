import { useCallback, useMemo, useState } from 'react'
import { addDays, addMonths, format, isSameDay, startOfWeek } from 'date-fns'
import { Bell, BellOff, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import {
  APPOINTMENTS,
  CRON_JOBS,
  KIND_COLOR,
  TASKS,
  type Appt,
  type CronJob,
  type Task,
} from '@/data/calendar'
import { Panel } from '@/components/ui/Panel'
import { Modal } from '@/components/ui/Modal'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import { TODAY, apptDate, hhmm, parseHM } from '@/features/calendar/util'
import { APPTS_KEY, TASKS_KEY, buildAgenda, loadJSON, type AgendaItem } from '@/features/calendar/agenda'
import { AgendaList } from '@/features/calendar/AgendaList'
import { MonthView } from '@/features/calendar/MonthView'
import { DayDetailModal } from '@/features/calendar/DayDetailModal'
import { CronDetailModal } from '@/features/calendar/CronDetailModal'
import { TaskPanel, TaskModal } from '@/features/calendar/TaskPanel'
import { RemindersPanel } from '@/features/calendar/RemindersPanel'
import { NudgeStack } from '@/features/calendar/NudgeStack'
import { useReminders } from '@/features/calendar/useReminders'

const DAY_START = 7
const DAY_END = 22
const HOUR_PX = 46

export function Calendar() {
  const [appts, setAppts] = useState<Appt[]>(() => loadJSON(APPTS_KEY, APPOINTMENTS))
  const [tasks, setTasks] = useState<Task[]>(() => loadJSON(TASKS_KEY, TASKS))
  const [view, setView] = useState<'week' | 'month'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)

  const [editing, setEditing] = useState<Appt | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [cronJob, setCronJob] = useState<CronJob | null>(null)
  const [dayDetail, setDayDetail] = useState<Date | null>(null)

  const weekStart = useMemo(
    () => addDays(startOfWeek(TODAY, { weekStartsOn: 1 }), weekOffset * 7),
    [weekOffset],
  )
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const month = useMemo(() => addMonths(TODAY, monthOffset), [monthOffset])

  const upNext = useMemo(() => buildAgenda(appts, tasks, 4), [appts, tasks])

  const openAgendaItem = (item: AgendaItem) => {
    if (item.source === 'appt') setEditing(item.raw as Appt)
    else setEditingTask(item.raw as Task)
  }

  // ─── Persistence helpers ───────────────────────────────────────────────────
  const saveAppt = (updated: Appt) => {
    setAppts((list) => {
      const next = list.map((a) => (a.id === updated.id ? updated : a))
      localStorage.setItem(APPTS_KEY, JSON.stringify(next))
      return next
    })
    setEditing(null)
  }

  const persistTasks = useCallback((next: Task[]) => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(next))
    return next
  }, [])

  const toggleTask = useCallback(
    (task: Task) => {
      setTasks((list) =>
        persistTasks(
          list.map((t) => (t.id === task.id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t)),
        ),
      )
    },
    [persistTasks],
  )

  const completeTask = useCallback(
    (id: string) => {
      setTasks((list) => persistTasks(list.map((t) => (t.id === id ? { ...t, status: 'done' } : t))))
    },
    [persistTasks],
  )

  const saveTask = (updated: Task) => {
    setTasks((list) => {
      const exists = list.some((t) => t.id === updated.id)
      return persistTasks(exists ? list.map((t) => (t.id === updated.id ? updated : t)) : [...list, updated])
    })
    setEditingTask(null)
  }

  const deleteTask = (id: string) => {
    setTasks((list) => persistTasks(list.filter((t) => t.id !== id)))
    setEditingTask(null)
  }

  const addTask = () =>
    setEditingTask({
      id: `new-${Date.now()}`,
      title: '',
      status: 'todo',
      priority: 'med',
      dayOffset: 0,
      reminderMinutes: 15,
    })

  // ─── Reminders engine ───────────────────────────────────────────────────────
  const reminders = useReminders(appts, tasks, { onCompleteTask: completeTask })

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* Calendar grid */}
      <div className="flex h-[72vh] min-w-0 flex-col lg:h-auto lg:flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg tracking-wider text-text">CALENDAR</h1>
            <span className="text-xs text-dim">
              {view === 'week'
                ? `${format(weekStart, 'dd MMM')} – ${format(addDays(weekStart, 6), 'dd MMM yyyy')}`
                : format(month, 'MMMM yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border border-line">
              {(['week', 'month'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-2 py-1 text-[11px] uppercase tracking-wider transition-colors',
                    view === v ? 'bg-panel-2 text-accent' : 'text-dim hover:text-text',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            {/* Reminder bell */}
            <button
              onClick={reminders.toggleEnabled}
              title={reminders.enabled ? 'Mute reminders' : 'Enable reminders'}
              className={cn('border border-line p-1.5', reminders.enabled ? 'text-accent' : 'text-dim hover:text-text')}
            >
              {reminders.enabled ? <Bell size={14} /> : <BellOff size={14} />}
            </button>
            {/* Period nav */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => (view === 'week' ? setWeekOffset((w) => w - 1) : setMonthOffset((m) => m - 1))}
                className="border border-line p-1 text-dim hover:text-text"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => (view === 'week' ? setWeekOffset(0) : setMonthOffset(0))}
                className="border border-line px-2 py-1 text-[11px] uppercase tracking-wider text-dim hover:text-text"
              >
                Today
              </button>
              <button
                onClick={() => (view === 'week' ? setWeekOffset((w) => w + 1) : setMonthOffset((m) => m + 1))}
                className="border border-line p-1 text-dim hover:text-text"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {view === 'week' ? (
          <WeekGrid days={days} appts={appts} onSelectAppt={setEditing} />
        ) : (
          <MonthView
            month={month}
            appts={appts}
            tasks={tasks}
            onSelectDay={setDayDetail}
            onSelectAppt={setEditing}
          />
        )}
      </div>

      {/* Side panels */}
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t border-line bg-panel/30 p-3 lg:w-[320px] lg:border-l lg:border-t-0">
        <RemindersPanel
          enabled={reminders.enabled}
          permission={reminders.permission}
          scheduled={reminders.scheduled}
          onToggle={reminders.toggleEnabled}
          onEnableNotifications={reminders.enableNotifications}
          onTest={reminders.testNudge}
        />

        <Panel title="Up Next" code="AGENDA" accent="#f0a020" bodyClassName="p-2">
          <AgendaList items={upNext} onSelect={openAgendaItem} emptyText="Nothing upcoming." />
        </Panel>

        <TaskPanel tasks={tasks} onToggle={toggleTask} onEdit={setEditingTask} onAdd={addTask} />

        <Panel title="AI Cron Jobs" code="AGT" accent="#36e0c8" bodyClassName="p-2">
          <div className="space-y-1.5">
            {CRON_JOBS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCronJob(c)}
                className="flex w-full items-center gap-2 border border-line bg-bg/30 px-2 py-1.5 text-left transition-colors hover:bg-panel-2/60"
              >
                <StatusDot
                  color={c.status === 'warn' ? '#f0a020' : c.status === 'running' ? '#36e0c8' : '#46d369'}
                  pulse={c.status === 'running'}
                  size={6}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-text">{c.name}</div>
                  <div className="text-[10px] text-dim">
                    {c.owner} · {c.schedule}
                  </div>
                </div>
                <span className="text-[9px] text-dim">{c.lastRun}</span>
              </button>
            ))}
          </div>
        </Panel>
      </aside>

      <EditModal appt={editing} onClose={() => setEditing(null)} onSave={saveAppt} />
      <TaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={saveTask} onDelete={deleteTask} />
      <CronDetailModal job={cronJob} onClose={() => setCronJob(null)} />
      <DayDetailModal
        day={dayDetail}
        appts={appts}
        tasks={tasks}
        onClose={() => setDayDetail(null)}
        onSelectAppt={(a) => {
          setDayDetail(null)
          setEditing(a)
        }}
        onToggleTask={toggleTask}
        onOpenWeek={(d) => {
          const wkStart = startOfWeek(TODAY, { weekStartsOn: 1 })
          const target = startOfWeek(d, { weekStartsOn: 1 })
          setWeekOffset(Math.round((target.getTime() - wkStart.getTime()) / (7 * 86_400_000)))
          setView('week')
          setDayDetail(null)
        }}
      />

      <NudgeStack
        nudges={reminders.nudges}
        onDismiss={reminders.dismiss}
        onSnooze={reminders.snooze}
        onComplete={reminders.complete}
      />
    </div>
  )
}

function WeekGrid({
  days,
  appts,
  onSelectAppt,
}: {
  days: Date[]
  appts: Appt[]
  onSelectAppt: (a: Appt) => void
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-[720px] lg:min-w-0">
        {/* Day headers */}
        <div className="sticky top-0 z-20 flex border-b border-line bg-bg pr-3" style={{ paddingLeft: 52 }}>
          {days.map((d) => {
            const today = isSameDay(d, TODAY)
            return (
              <div key={d.toISOString()} className="flex-1 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-dim">{format(d, 'EEE')}</div>
                <div className={`font-display text-lg ${today ? 'text-accent' : 'text-text'}`}>{format(d, 'd')}</div>
              </div>
            )
          })}
        </div>

        {/* Time grid */}
        <div className="relative flex" style={{ height: (DAY_END - DAY_START) * HOUR_PX }}>
          {/* hour labels */}
          <div className="w-[52px] shrink-0">
            {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
              <div key={i} className="relative border-t border-line/60" style={{ height: HOUR_PX }}>
                <span className="absolute -top-2 left-1 text-[10px] tabular-nums text-dim">
                  {String(DAY_START + i).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
          {/* day columns */}
          {days.map((d) => {
            const dayAppts = appts.filter((a) => isSameDay(apptDate(a), d))
            return (
              <div key={d.toISOString()} className="relative flex-1 border-l border-line/60">
                {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
                  <div key={i} className="border-t border-line/40" style={{ height: HOUR_PX }} />
                ))}
                {dayAppts.map((a) => (
                  <ApptBlock key={a.id} appt={a} onClick={() => onSelectAppt(a)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ApptBlock({ appt, onClick }: { appt: Appt; onClick: () => void }) {
  const top = (appt.start - DAY_START) * HOUR_PX
  const height = Math.max(22, (appt.end - appt.start) * HOUR_PX - 2)
  const color = KIND_COLOR[appt.kind]
  return (
    <button
      onClick={onClick}
      className="absolute left-0.5 right-0.5 overflow-hidden border-l-2 px-1.5 py-1 text-left transition-all hover:z-10 hover:brightness-125"
      style={{ top, height, backgroundColor: `${color}22`, borderColor: color }}
    >
      <div className="truncate text-[11px] font-medium text-text">{appt.title}</div>
      <div className="truncate text-[9px] text-dim">{hhmm(appt.start)}–{hhmm(appt.end)}</div>
    </button>
  )
}

function EditModal({ appt, onClose, onSave }: { appt: Appt | null; onClose: () => void; onSave: (a: Appt) => void }) {
  const [draft, setDraft] = useState<Appt | null>(appt)
  if (appt && (!draft || draft.id !== appt.id)) setDraft(appt)
  if (!appt || !draft) return null
  const color = KIND_COLOR[draft.kind]

  return (
    <Modal open={!!appt} onClose={onClose} title="Appointment" code={format(apptDate(appt), 'EEE dd MMM')} accent={color} width={460}>
      <label className="label mb-1 block">Title</label>
      <input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        className="mb-3 w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      />

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="label mb-1 block">Start</label>
          <input
            type="time"
            value={hhmm(draft.start)}
            onChange={(e) => {
              const h = parseHM(e.target.value)
              if (h != null) setDraft({ ...draft, start: h })
            }}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="label mb-1 block">End</label>
          <input
            type="time"
            value={hhmm(draft.end)}
            onChange={(e) => {
              const h = parseHM(e.target.value)
              if (h != null) setDraft({ ...draft, end: h })
            }}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="label mb-1 block">Kind</label>
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as Appt['kind'] })}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          >
            {Object.keys(KIND_COLOR).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label mb-1 block">Remind</label>
          <select
            value={draft.reminderMinutes ?? 10}
            onChange={(e) => setDraft({ ...draft, reminderMinutes: Number(e.target.value) })}
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

      <label className="label mb-1 block">Location</label>
      <input
        value={draft.location ?? ''}
        onChange={(e) => setDraft({ ...draft, location: e.target.value })}
        className="mb-3 w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      />

      <label className="label mb-1 block">Notes</label>
      <textarea
        value={draft.notes ?? ''}
        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        rows={3}
        className="mb-4 w-full resize-none border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      />

      <div className="flex items-center justify-between text-xs text-dim">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock size={12} /> {hhmm(draft.start)}–{hhmm(draft.end)}
          </span>
          {draft.location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {draft.location}
            </span>
          )}
        </span>
        <div className="flex gap-2">
          <button onClick={onClose} className="border border-line px-3 py-1.5 uppercase tracking-wider hover:text-text">
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="border px-3 py-1.5 uppercase tracking-wider"
            style={{ borderColor: `${color}66`, color }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
