import { useMemo, useState } from 'react'
import { addDays, addMonths, format, isSameDay, startOfWeek } from 'date-fns'
import { Bell, BellOff, CheckSquare, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import {
  KIND_COLOR,
  PRIORITY_COLOR,
  REMINDER_COLOR,
  type Appt,
  type CronJob,
  type Reminder,
  type Task,
} from '@/data/calendar'
import { Panel } from '@/components/ui/Panel'
import { Modal } from '@/components/ui/Modal'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import { TODAY, apptDate, dayOffsetOf, hhmm, offsetDate, parseHM } from '@/features/calendar/util'
import { buildAgenda, type AgendaItem } from '@/features/calendar/agenda'
import { cronScheduleLabel } from '@/features/calendar/cron'
import { AgendaList } from '@/features/calendar/AgendaList'
import { DateField } from '@/features/calendar/DateField'
import { DayView } from '@/features/calendar/DayView'
import { MonthView } from '@/features/calendar/MonthView'
import { DayDetailModal } from '@/features/calendar/DayDetailModal'
import { CronDetailModal } from '@/features/calendar/CronDetailModal'
import { CronEditModal } from '@/features/calendar/CronEditModal'
import { ReminderModal } from '@/features/calendar/ReminderModal'
import { TaskPanel, TaskModal } from '@/features/calendar/TaskPanel'
import { RemindersPanel } from '@/features/calendar/RemindersPanel'
import { useCalendar } from '@/features/calendar/CalendarContext'

const DAY_START = 7
const DAY_END = 22
const HOUR_PX = 46

export function Calendar() {
  // Calendar data + reminder engine live in the app-wide CalendarProvider so
  // reminders keep firing regardless of which page is open.
  const {
    appts,
    tasks,
    reminders,
    crons,
    saveAppt,
    toggleTask,
    saveTask,
    deleteTask,
    saveReminder,
    deleteReminder,
    saveCron,
    remindersEngine,
  } = useCalendar()

  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)

  const [editing, setEditing] = useState<Appt | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [cronJob, setCronJob] = useState<CronJob | null>(null)
  const [editingCron, setEditingCron] = useState<CronJob | null>(null)
  const [dayDetail, setDayDetail] = useState<Date | null>(null)

  const weekStart = useMemo(
    () => addDays(startOfWeek(TODAY, { weekStartsOn: 1 }), weekOffset * 7),
    [weekOffset],
  )
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const month = useMemo(() => addMonths(TODAY, monthOffset), [monthOffset])

  const upNext = useMemo(
    () => buildAgenda({ appts, tasks, reminders, crons }, 6),
    [appts, tasks, reminders, crons],
  )

  const openAgendaItem = (item: AgendaItem) => {
    if (item.source === 'appt') setEditing(item.raw as Appt)
    else if (item.source === 'task') setEditingTask(item.raw as Task)
    else if (item.source === 'reminder') setEditingReminder(item.raw as Reminder)
    else setCronJob(item.raw as CronJob)
  }

  // Resolve a scheduled ping back to its source entity and open its editor.
  const openScheduled = (source: 'appt' | 'task' | 'reminder', refId: string) => {
    if (source === 'appt') {
      const a = appts.find((x) => x.id === refId)
      if (a) setEditing(a)
    } else if (source === 'task') {
      const t = tasks.find((x) => x.id === refId)
      if (t) setEditingTask(t)
    } else {
      const r = reminders.find((x) => x.id === refId)
      if (r) setEditingReminder(r)
    }
  }

  // Wrap the context mutators so the editor modals close on save/delete.
  const handleSaveAppt = (a: Appt) => {
    saveAppt(a)
    setEditing(null)
  }
  const handleSaveTask = (t: Task) => {
    saveTask(t)
    setEditingTask(null)
  }
  const handleDeleteTask = (id: string) => {
    deleteTask(id)
    setEditingTask(null)
  }
  const handleSaveReminder = (r: Reminder) => {
    saveReminder(r)
    setEditingReminder(null)
  }
  const handleDeleteReminder = (id: string) => {
    deleteReminder(id)
    setEditingReminder(null)
  }
  const handleSaveCron = (c: CronJob) => {
    saveCron(c)
    setEditingCron(null)
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

  // Quick-add a reminder from the panel (no modal — straight to the list).
  const addReminderQuick = (title: string, dayOffset: number, time: number) =>
    saveReminder({ id: `r-${Date.now()}`, title, dayOffset, time })

  // Double-click empty grid space → new reminder prefilled to that day + time.
  const createReminderAt = (dayOffset: number, time: number) =>
    setEditingReminder({ id: `new-${Date.now()}`, title: '', dayOffset, time })

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* Calendar grid */}
      <div className="flex h-[72vh] min-w-0 flex-col lg:h-auto lg:flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg tracking-wider text-text">CALENDAR</h1>
            <span className="text-xs text-dim">
              {view === 'day'
                ? format(TODAY, 'EEEE dd MMM yyyy')
                : view === 'week'
                  ? `${format(weekStart, 'dd MMM')} – ${format(addDays(weekStart, 6), 'dd MMM yyyy')}`
                  : format(month, 'MMMM yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border border-line">
              {(['day', 'week', 'month'] as const).map((v) => (
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
              onClick={remindersEngine.toggleEnabled}
              title={remindersEngine.enabled ? 'Mute reminders' : 'Enable reminders'}
              className={cn(
                'border border-line p-1.5',
                remindersEngine.enabled ? 'text-accent' : 'text-dim hover:text-text',
              )}
            >
              {remindersEngine.enabled ? <Bell size={14} /> : <BellOff size={14} />}
            </button>
            {/* Period nav — day view is fixed to today, so no prev/next */}
            {view !== 'day' && (
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
            )}
          </div>
        </div>

        {view === 'day' ? (
          <DayView
            appts={appts}
            tasks={tasks}
            reminders={reminders}
            crons={crons}
            onSelectAppt={setEditing}
            onSelectTask={setEditingTask}
            onToggleTask={toggleTask}
            onSelectReminder={setEditingReminder}
            onSelectCron={setCronJob}
          />
        ) : view === 'week' ? (
          <WeekGrid
            days={days}
            appts={appts}
            tasks={tasks}
            reminders={reminders}
            onSelectAppt={setEditing}
            onSelectTask={setEditingTask}
            onSelectReminder={setEditingReminder}
            onCreateAt={createReminderAt}
          />
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
          enabled={remindersEngine.enabled}
          permission={remindersEngine.permission}
          scheduled={remindersEngine.scheduled}
          onToggle={remindersEngine.toggleEnabled}
          onEnableNotifications={remindersEngine.enableNotifications}
          onTest={remindersEngine.testNudge}
          onAddReminder={addReminderQuick}
          onSelect={(item) => openScheduled(item.source, item.refId)}
        />

        <Panel title="Up Next" code="AGENDA" accent="#f0a020" bodyClassName="p-2">
          <AgendaList items={upNext} onSelect={openAgendaItem} emptyText="Nothing upcoming." />
        </Panel>

        <TaskPanel tasks={tasks} onToggle={toggleTask} onEdit={setEditingTask} onAdd={addTask} />

        <Panel title="AI Cron Jobs" code="AGT" accent="#36e0c8" bodyClassName="p-2">
          <div className="space-y-1.5">
            {crons.map((c) => (
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
                    {c.owner} · {cronScheduleLabel(c.schedule)}
                  </div>
                </div>
                <span className="text-[9px] text-dim">{c.lastRun}</span>
              </button>
            ))}
          </div>
        </Panel>
      </aside>

      <EditModal appt={editing} onClose={() => setEditing(null)} onSave={handleSaveAppt} />
      <TaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleSaveTask} onDelete={handleDeleteTask} />
      <ReminderModal
        reminder={editingReminder}
        onClose={() => setEditingReminder(null)}
        onSave={handleSaveReminder}
        onDelete={handleDeleteReminder}
      />
      <CronDetailModal
        job={cronJob}
        onClose={() => setCronJob(null)}
        onEdit={(c) => {
          setCronJob(null)
          setEditingCron(c)
        }}
      />
      <CronEditModal job={editingCron} onClose={() => setEditingCron(null)} onSave={handleSaveCron} />
      <DayDetailModal
        day={dayDetail}
        appts={appts}
        tasks={tasks}
        reminders={reminders}
        onClose={() => setDayDetail(null)}
        onSelectAppt={(a) => {
          setDayDetail(null)
          setEditing(a)
        }}
        onSelectReminder={(r) => {
          setDayDetail(null)
          setEditingReminder(r)
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
    </div>
  )
}

function WeekGrid({
  days,
  appts,
  tasks,
  reminders,
  onSelectAppt,
  onSelectTask,
  onSelectReminder,
  onCreateAt,
}: {
  days: Date[]
  appts: Appt[]
  tasks: Task[]
  reminders: Reminder[]
  onSelectAppt: (a: Appt) => void
  onSelectTask: (t: Task) => void
  onSelectReminder: (r: Reminder) => void
  onCreateAt: (dayOffset: number, hour: number) => void
}) {
  // Translate a vertical click position in a day column into a fractional hour,
  // snapped to the nearest 15 minutes.
  const hourFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const raw = DAY_START + y / HOUR_PX
    const snapped = Math.round(raw * 4) / 4
    return Math.min(DAY_END - 0.25, Math.max(DAY_START, snapped))
  }

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
          {/* day columns — double-click empty space to add a reminder at that time */}
          {days.map((d) => {
            const dayAppts = appts.filter((a) => isSameDay(apptDate(a), d))
            const dayReminders = reminders.filter((r) => !r.done && isSameDay(offsetDate(r.dayOffset), d))
            const dayTasks = tasks.filter(
              (t) =>
                t.status !== 'done' &&
                t.dayOffset != null &&
                t.dueTime != null &&
                isSameDay(offsetDate(t.dayOffset), d),
            )
            return (
              <div
                key={d.toISOString()}
                className="relative flex-1 cursor-cell border-l border-line/60"
                onDoubleClick={(e) => onCreateAt(dayOffsetOf(d), hourFromClick(e))}
                title="Double-click to add a reminder"
              >
                {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
                  <div key={i} className="border-t border-line/40" style={{ height: HOUR_PX }} />
                ))}
                {dayAppts.map((a) => (
                  <ApptBlock key={a.id} appt={a} onClick={() => onSelectAppt(a)} />
                ))}
                {dayTasks.map((t) => (
                  <TaskMarker key={t.id} task={t} onClick={() => onSelectTask(t)} />
                ))}
                {dayReminders.map((r) => (
                  <ReminderMarker key={r.id} reminder={r} onClick={() => onSelectReminder(r)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ReminderMarker({ reminder, onClick }: { reminder: Reminder; onClick: () => void }) {
  const top = (reminder.time - DAY_START) * HOUR_PX
  return (
    <button
      onClick={onClick}
      onDoubleClick={(e) => e.stopPropagation()}
      title={`${reminder.title} · ${hhmm(reminder.time)}`}
      className="absolute right-0.5 z-10 flex items-center gap-1 border px-1 py-0.5 text-[9px] leading-none hover:brightness-125"
      style={{
        top: top - 7,
        color: REMINDER_COLOR,
        borderColor: `${REMINDER_COLOR}66`,
        backgroundColor: '#11141b',
      }}
    >
      <Bell size={9} />
      <span className="max-w-[80px] truncate">{reminder.title}</span>
    </button>
  )
}

function TaskMarker({ task, onClick }: { task: Task; onClick: () => void }) {
  const color = PRIORITY_COLOR[task.priority]
  const top = (task.dueTime! - DAY_START) * HOUR_PX
  return (
    <button
      onClick={onClick}
      onDoubleClick={(e) => e.stopPropagation()}
      title={`${task.title} · due ${hhmm(task.dueTime!)}`}
      className="absolute right-0.5 z-10 flex items-center gap-1 border px-1 py-0.5 text-[9px] leading-none hover:brightness-125"
      style={{ top: top - 7, color, borderColor: `${color}66`, backgroundColor: '#11141b' }}
    >
      <CheckSquare size={9} />
      <span className="max-w-[80px] truncate">{task.title}</span>
    </button>
  )
}

function ApptBlock({ appt, onClick }: { appt: Appt; onClick: () => void }) {
  const top = (appt.start - DAY_START) * HOUR_PX
  const height = Math.max(22, (appt.end - appt.start) * HOUR_PX - 2)
  const color = KIND_COLOR[appt.kind]
  return (
    <button
      onClick={onClick}
      onDoubleClick={(e) => e.stopPropagation()}
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
    <Modal open={!!appt} onClose={onClose} title="Appointment" code={format(apptDate(draft), 'EEE dd MMM')} accent={color} width={460}>
      <label className="label mb-1 block">Title</label>
      <input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        className="mb-3 w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      />

      <label className="label mb-1 block">Date</label>
      <DateField value={draft.dayOffset} onChange={(d) => setDraft({ ...draft, dayOffset: d ?? 0 })} className="mb-3 w-full" />

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
