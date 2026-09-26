import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, addMonths, endOfMonth, format, getISOWeek, isSameDay, startOfMonth, startOfWeek } from 'date-fns'
import {
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Cpu,
  Filter,
  MapPin,
  Maximize2,
  Repeat,
  Trash2,
} from 'lucide-react'
import { KIND_COLOR, PRIORITY_COLOR, PRIORITY_LABEL, cronVisible, type Appt, type CronJob, type Task } from '@/data/calendar'
import { Panel } from '@/components/ui/Panel'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { TODAY, apptDate, apptOccursOn, dayOffsetOf, hhmm, offsetDate, parseHM, taskOccursOn } from '@/features/calendar/util'
import { buildAgenda, type AgendaItem } from '@/features/calendar/agenda'
import { CRON_STATUS_COLOR } from '@/features/calendar/cron'
import { AgendaList } from '@/features/calendar/AgendaList'
import { DateField } from '@/features/calendar/DateField'
import { DayView } from '@/features/calendar/DayView'
import { MonthView } from '@/features/calendar/MonthView'
import { MiniMonthPicker } from '@/features/calendar/MiniMonthPicker'
import { useIsDesktop } from '@/lib/useMediaQuery'
import { DayDetailModal } from '@/features/calendar/DayDetailModal'
import { RecurrenceField } from '@/features/calendar/RecurrenceField'
import { CronDetailModal } from '@/features/calendar/CronDetailModal'
import { CronEditModal } from '@/features/calendar/CronEditModal'
import { CronManager } from '@/features/calendar/CronManager'
import { SourceIcon, TaskPanel, TaskModal } from '@/features/calendar/TaskPanel'
import { useCalendar } from '@/features/calendar/CalendarContext'
import { layoutOverlaps } from '@/features/calendar/overlap'

// The whole day, midnight to midnight — a todo at 23:59 must be reachable.
const DAY_START = 0
const DAY_END = 24
const HOURS = DAY_END - DAY_START

type Layer = 'events' | 'todos' | 'crons'
type Filters = Record<Layer, boolean>
const FILTER_KEY = 'os:calendar:filter'
const LAYERS: { id: Layer; label: string; color: string }[] = [
  { id: 'events', label: 'Events', color: '#36e0c8' },
  { id: 'todos', label: 'Todos', color: '#46d369' },
  { id: 'crons', label: 'AI crons', color: '#c77591' },
]

type TablePanel = 'upnext' | 'todos' | 'crons'

function loadFilters(): Filters {
  try {
    return { events: true, todos: true, crons: true, ...JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}') }
  } catch {
    return { events: true, todos: true, crons: true }
  }
}

/** Fractional hours a cron job runs at on any given day. */
function cronRunHours(c: CronJob): number[] {
  const s = c.schedule
  if (s.type === 'daily') return [s.hour]
  const step = s.type === 'everyHours' ? s.n : s.n / 60
  if (step <= 0) return []
  const out: number[] = []
  for (let h = step; h < 24 && out.length < 288; h += step) out.push(h)
  return [0, ...out]
}

export function Calendar() {
  // Calendar data + notification engine live in the app-wide CalendarProvider
  // so pings keep firing regardless of which page is open.
  const { appts, tasks, crons, saveAppt, deleteAppt, toggleTask, saveTask, deleteTask, saveCron, deleteCron } =
    useCalendar()
  const navigate = useNavigate()

  // Desktop defaults to week (room for the 7-day grid); phones open on Day.
  const isDesktop = useIsDesktop()
  const [view, setView] = useState<'day' | 'week' | 'month'>(() => (isDesktop ? 'week' : 'day'))
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [dayOffset, setDayOffset] = useState(0)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>(loadFilters)
  const toggleLayer = (l: Layer) =>
    setFilters((f) => {
      const next = { ...f, [l]: !f[l] }
      try {
        localStorage.setItem(FILTER_KEY, JSON.stringify(next))
      } catch {
        /* per-session then */
      }
      return next
    })

  // Pop-ups stack like Ops: the full-view table stays open underneath the
  // item you open from it, so closing the item returns to the table.
  const [table, setTable] = useState<TablePanel | null>(null)
  const [editing, setEditing] = useState<Appt | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [cronId, setCronId] = useState<string | null>(null)
  const [editingCron, setEditingCron] = useState<CronJob | null>(null)
  const [dayDetail, setDayDetail] = useState<Date | null>(null)
  const cronJob = crons.find((c) => c.id === cronId) ?? null

  const weekStart = useMemo(() => addDays(startOfWeek(TODAY, { weekStartsOn: 1 }), weekOffset * 7), [weekOffset])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const month = useMemo(() => addMonths(TODAY, monthOffset), [monthOffset])
  const selectedDay = useMemo(() => offsetDate(dayOffset), [dayOffset])

  // What the views draw, after the layer filter.
  const shownAppts = filters.events ? appts : []
  const shownTasks = filters.todos ? tasks : []
  const shownCrons = filters.crons ? crons : []

  const isDayMarked = (day: Date) =>
    shownAppts.some((a) => apptOccursOn(a, day)) || shownTasks.some((t) => t.status !== 'done' && taskOccursOn(t, day))

  const agendaSrc = useMemo(
    () => ({ appts: shownAppts, tasks: shownTasks, crons: shownCrons.filter(cronVisible) }),
    [shownAppts, shownTasks, shownCrons],
  )
  const upNext = useMemo(() => buildAgenda(agendaSrc, 6), [agendaSrc])

  const openAgendaItem = (item: AgendaItem) => {
    if (item.source === 'appt') setEditing(item.raw as Appt)
    else if (item.source === 'task') setEditingTask(item.raw as Task)
    else setCronId((item.raw as CronJob).id)
  }


  const openSource = (t: Task) => {
    setEditingTask(null)
    setTable(null)
    if (t.source === 'project' && t.sourceRef?.projectId) navigate(`/projects?project=${encodeURIComponent(t.sourceRef.projectId)}`)
    else if (t.source === 'note' && t.sourceRef?.noteId) navigate(`/notes?note=${encodeURIComponent(t.sourceRef.noteId)}`)
  }

  const addTask = () =>
    setEditingTask({ id: `new-${Date.now()}`, title: '', status: 'todo', priority: 'med', dayOffset: 0, notify: false, source: 'manual' })


  // Double-click empty grid space → new timed todo at that day + time.
  const createTodoAt = (day: number, time: number) =>
    setEditingTask({
      id: `new-${Date.now()}`,
      title: '',
      status: 'todo',
      priority: 'low',
      dayOffset: day,
      dueTime: time,
      notify: true,
      reminderMinutes: 0,
      source: 'manual',
    })

  const jumpToWeekOf = (d: Date) => {
    const base = startOfWeek(TODAY, { weekStartsOn: 1 })
    const target = startOfWeek(d, { weekStartsOn: 1 })
    setWeekOffset(Math.round((target.getTime() - base.getTime()) / (7 * 86_400_000)))
  }

  const weekLabel =
    view === 'week'
      ? `W${getISOWeek(weekStart)}`
      : view === 'month'
        ? `W${getISOWeek(startOfMonth(month))}–${getISOWeek(endOfMonth(month))}`
        : `W${getISOWeek(selectedDay)}`

  const step = (dir: -1 | 1) =>
    view === 'day' ? setDayOffset((d) => d + dir) : view === 'week' ? setWeekOffset((w) => w + dir) : setMonthOffset((m) => m + dir)

  const activeLayers = LAYERS.filter((l) => filters[l.id]).length

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden lg:flex-row lg:gap-0 lg:overflow-hidden">
      {/* Calendar region. Week/month cap their height on phones (the grid
       *  scrolls inside); Day view grows with its content so the whole page
       *  scrolls as one — agenda, todos and panels alike. */}
      <div
        className={cn(
          'flex min-w-0 flex-col lg:h-auto lg:max-h-none lg:min-h-0 lg:flex-1',
          view !== 'day' && 'max-h-[78vh]',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-line px-2 py-2 sm:gap-2 sm:px-4">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-lg tracking-wider text-text">CALENDAR</h1>
            <span className="text-xs text-dim">
              {view === 'day'
                ? format(selectedDay, 'EEE dd MMM yyyy')
                : view === 'week'
                  ? `${format(weekStart, 'dd MMM')} – ${format(addDays(weekStart, 6), 'dd MMM yyyy')}`
                  : format(month, 'MMMM yyyy')}
            </span>
            <span className="border border-line px-1 font-display text-[10px] tabular-nums text-accent" title="ISO week number">
              {weekLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
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
            {/* Layer filter */}
            <div className="relative">
              <button
                onClick={() => setFilterOpen((o) => !o)}
                title="Show / hide events, todos, crons"
                className={cn(
                  'flex items-center gap-1 border border-line p-1.5',
                  filterOpen || activeLayers < LAYERS.length ? 'text-accent' : 'text-dim hover:text-text',
                )}
              >
                <Filter size={13} />
                {activeLayers < LAYERS.length && <span className="text-[9px] tabular-nums">{activeLayers}</span>}
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 top-full z-40 mt-2 w-44 animate-fade-in border border-line-2 bg-panel p-1.5 shadow-glow">
                    <div className="label mb-1 px-1">Show</div>
                    {LAYERS.map((l) => (
                      <label key={l.id} className="flex cursor-pointer items-center gap-2 px-1 py-1 text-xs text-text hover:bg-panel-2/60">
                        <input type="checkbox" checked={filters[l.id]} onChange={() => toggleLayer(l.id)} className="size-3.5" style={{ accentColor: l.color }} />
                        <span className="h-2 w-2 shrink-0" style={{ backgroundColor: l.color }} />
                        {l.label}
                      </label>
                    ))}
                    <div className="mt-1 flex gap-1 border-t border-line px-1 pt-1.5 text-[10px] uppercase tracking-wider">
                      {LAYERS.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => {
                            const next = { events: false, todos: false, crons: false, [l.id]: true } as Filters
                            setFilters(next)
                            try {
                              localStorage.setItem(FILTER_KEY, JSON.stringify(next))
                            } catch {
                              /* ignore */
                            }
                          }}
                          className="text-dim hover:text-text"
                          title={`Only ${l.label.toLowerCase()}`}
                        >
                          only {l.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <button onClick={() => step(-1)} className="border border-line p-1 text-dim hover:text-text">
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => (view === 'day' ? setDayOffset(0) : view === 'week' ? setWeekOffset(0) : setMonthOffset(0))}
                className="border border-line px-2 py-1 text-[11px] uppercase tracking-wider text-dim hover:text-text"
              >
                Today
              </button>
              <button onClick={() => step(1)} className="border border-line p-1 text-dim hover:text-text">
                <ChevronRight size={14} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setDatePickerOpen((o) => !o)}
                  title={view === 'day' ? 'Pick a date' : view === 'week' ? 'Jump to a week' : 'Jump to a month'}
                  className={cn('border border-line p-1', datePickerOpen ? 'text-accent' : 'text-dim hover:text-text')}
                >
                  <CalendarDays size={14} />
                </button>
                {datePickerOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setDatePickerOpen(false)} />
                    <div className="absolute right-0 top-full z-40 mt-2 animate-fade-in">
                      <MiniMonthPicker
                        value={view === 'day' ? selectedDay : view === 'week' ? weekStart : month}
                        isDayMarked={isDayMarked}
                        onSelect={(d) => {
                          if (view === 'day') setDayOffset(dayOffsetOf(d))
                          else if (view === 'week') jumpToWeekOf(d)
                          else setMonthOffset((d.getFullYear() - TODAY.getFullYear()) * 12 + d.getMonth() - TODAY.getMonth())
                          setDatePickerOpen(false)
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {view === 'day' ? (
          <DayView
            date={selectedDay}
            appts={shownAppts}
            tasks={shownTasks}
            crons={shownCrons}
            onSelectAppt={setEditing}
            onSelectTask={setEditingTask}
            onToggleTask={toggleTask}
            onSelectCron={(c) => setCronId(c.id)}
          />
        ) : view === 'week' ? (
          <WeekGrid
            days={days}
            appts={shownAppts}
            tasks={shownTasks}
            crons={shownCrons.filter(cronVisible)}
            onSelectAppt={setEditing}
            onSelectTask={setEditingTask}
            onSelectCron={(c) => setCronId(c.id)}
            onCreateAt={createTodoAt}
          />
        ) : (
          <MonthView month={month} appts={shownAppts} tasks={shownTasks} onSelectDay={setDayDetail} onSelectAppt={setEditing} />
        )}
      </div>

      {/* Side panels — each opens a full view, like Ops. */}
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-x-hidden bg-panel/30 px-3 pb-3 lg:w-[320px] lg:overflow-y-auto lg:border-l lg:p-3">

        {/* Day view's own agenda already covers "what's next" on phones. */}
        <Panel
          title="Up Next"
          code="AGENDA"
          accent="#f0a020"
          bodyClassName="p-2"
          className={cn(view === 'day' && 'hidden lg:flex')}
          right={<ExpandBtn onClick={() => setTable('upnext')} />}
        >
          <AgendaList items={upNext} onSelect={openAgendaItem} emptyText="Nothing upcoming." />
        </Panel>

        <TaskPanel tasks={tasks} onToggle={toggleTask} onEdit={setEditingTask} onAdd={addTask} onExpand={() => setTable('todos')} />

        <Panel title="AI Cron Jobs" code="AGT" accent="#c77591" bodyClassName="p-2" right={<ExpandBtn onClick={() => setTable('crons')} />}>
          <CronManager variant="panel" />
        </Panel>
      </aside>

      {/* Full-view tables (parent pop-ups) */}

      <Modal open={table === 'upnext'} onClose={() => setTable(null)} title="Up Next" code="AGENDA" accent="#f0a020" width={640}>
        <UpNextTable items={buildAgenda(agendaSrc, 40)} onSelect={openAgendaItem} />
      </Modal>

      <Modal open={table === 'todos'} onClose={() => setTable(null)} title="Todo" code="TODO" accent="#46d369" width={760}>
        <TodoTable tasks={tasks} onToggle={toggleTask} onOpen={setEditingTask} onAdd={addTask} />
      </Modal>

      <Modal open={table === 'crons'} onClose={() => setTable(null)} title="AI Cron Jobs" code="AGT" accent="#c77591" width={760}>
        <CronManager variant="table" />
      </Modal>

      {/* Item pop-ups (children) — rendered after the tables so they stack on top. */}
      <DayDetailModal
        day={dayDetail}
        appts={shownAppts}
        tasks={shownTasks}
        onClose={() => setDayDetail(null)}
        onSelectAppt={setEditing}
        onSelectTask={setEditingTask}
        onToggleTask={toggleTask}
        onOpenWeek={(d) => {
          jumpToWeekOf(d)
          setView('week')
          setDayDetail(null)
        }}
      />
      <EditModal
        appt={editing}
        onClose={() => setEditing(null)}
        onSave={(a) => {
          saveAppt(a)
          setEditing(null)
        }}
        onDelete={(id) => {
          deleteAppt(id)
          setEditing(null)
        }}
      />
      <TaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={(t) => {
          saveTask(t)
          setEditingTask(null)
        }}
        onDelete={(id) => {
          deleteTask(id)
          setEditingTask(null)
        }}
        onOpenSource={openSource}
      />
      <CronDetailModal job={cronJob} onClose={() => setCronId(null)} onEdit={(c) => setEditingCron(c)} />
      <CronEditModal
        job={editingCron}
        onClose={() => setEditingCron(null)}
        onSave={(c) => {
          saveCron(c)
          setEditingCron(null)
        }}
        onDelete={(id) => {
          deleteCron(id)
          setEditingCron(null)
          setCronId(null)
        }}
      />
    </div>
  )
}

function ExpandBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Open full view" className="text-dim hover:text-text">
      <Maximize2 size={12} />
    </button>
  )
}

function UpNextTable({ items, onSelect }: { items: AgendaItem[]; onSelect: (i: AgendaItem) => void }) {
  return (
    <>
      <table className="w-full text-left text-[11px]">
        <thead className="text-[9px] uppercase tracking-wider text-dim">
          <tr className="border-b border-line">
            <th className="px-2 py-1.5 font-normal">When</th>
            <th className="px-2 py-1.5 font-normal">What</th>
            <th className="px-2 py-1.5 font-normal">Kind</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={`${it.id}:${it.when}`} onClick={() => onSelect(it)} className="cursor-pointer border-b border-line/40 hover:bg-panel-2/60">
              <td className="px-2 py-1.5 tabular-nums text-dim">{format(it.when, 'EEE dd MMM HH:mm')}</td>
              <td className="px-2 py-1.5 text-text">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: it.color }} />
                {it.title}
              </td>
              <td className="px-2 py-1.5 text-dim">{it.source === 'appt' ? 'event' : it.source === 'task' ? 'todo' : 'cron'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <div className="p-3 text-xs text-dim">Nothing upcoming.</div>}
    </>
  )
}

type SourceFilter = 'all' | 'manual' | 'project' | 'note'
type SortKey = 'title' | 'source' | 'due' | 'priority' | 'notify'
const PRIORITY_RANK = { high: 0, med: 1, low: 2 } as const

function TodoTable({
  tasks,
  onToggle,
  onOpen,
  onAdd,
}: {
  tasks: Task[]
  onToggle: (t: Task) => void
  onOpen: (t: Task) => void
  onAdd: () => void
}) {
  const [src, setSrc] = useState<SourceFilter>('all')
  const [showDone, setShowDone] = useState(false)
  const count = (s: SourceFilter) => tasks.filter((t) => t.status !== 'done' && (s === 'all' || (t.source ?? 'manual') === s)).length
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'due', dir: 1 })
  const sortBy = (key: SortKey) => setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
  const byDue = (a: Task, b: Task) => (a.dayOffset ?? 999) - (b.dayOffset ?? 999) || (a.dueTime ?? 99) - (b.dueTime ?? 99)
  const cmp: Record<SortKey, (a: Task, b: Task) => number> = {
    title: (a, b) => a.title.localeCompare(b.title),
    source: (a, b) => (a.source ?? 'manual').localeCompare(b.source ?? 'manual'),
    due: byDue,
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    notify: (a, b) => Number(b.dueTime != null && b.notify !== false) - Number(a.dueTime != null && a.notify !== false),
  }
  const rows = tasks
    .filter((t) => (showDone || t.status !== 'done') && (src === 'all' || (t.source ?? 'manual') === src))
    .sort((a, b) => sort.dir * cmp[sort.key](a, b) || byDue(a, b))
  const Th = ({ k, children }: { k: SortKey; children: string }) => (
    <th className="px-2 py-1.5 font-normal">
      <button onClick={() => sortBy(k)} className={cn('flex items-center gap-0.5 uppercase tracking-wider', sort.key === k ? 'text-text' : 'hover:text-text')}>
        {children}
        {sort.key === k && (sort.dir === 1 ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
      </button>
    </th>
  )
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-1 text-[10px]">
        {(['all', 'manual', 'project', 'note'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSrc(s)}
            className={cn('border px-1.5 py-0.5 uppercase tracking-wider', src === s ? 'border-line-2 text-text' : 'border-line text-dim hover:text-text')}
          >
            {s === 'project' ? 'projects' : s === 'note' ? 'notes' : s} {count(s)}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1 text-dim">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="size-3" /> done
        </label>
        <button onClick={onAdd} className="ml-auto border border-line px-2 py-0.5 uppercase tracking-wider text-dim hover:text-text">
          + Add
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-dim">
            <tr className="border-b border-line">
              <th className="w-6 px-2 py-1.5" />
              <Th k="title">Todo</Th>
              <Th k="source">From</Th>
              <Th k="due">Due</Th>
              <Th k="priority">Priority</Th>
              <Th k="notify">Notify</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} onClick={() => onOpen(t)} className="cursor-pointer border-b border-line/40 hover:bg-panel-2/60">
                <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={t.status === 'done'} onChange={() => onToggle(t)} className="size-3.5 accent-neon-green" />
                </td>
                <td className={cn('px-2 py-1.5', t.status === 'done' ? 'text-dim line-through' : 'text-text')}>{t.title}</td>
                <td className="px-2 py-1.5 text-dim">
                  <span className="flex items-center gap-1">
                    <SourceIcon task={t} size={10} />
                    {t.source === 'project' ? 'project' : t.source === 'note' ? 'note' : 'manual'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dim">
                  {t.dayOffset == null ? '—' : format(offsetDate(t.dayOffset), 'EEE dd MMM')}
                  {t.dueTime != null && ` ${hhmm(t.dueTime)}`}
                  {t.recurrence && <Repeat size={9} className="ml-1 inline" />}
                </td>
                <td className="px-2 py-1.5" style={{ color: PRIORITY_COLOR[t.priority] }}>
                  {PRIORITY_LABEL[t.priority]}
                </td>
                <td className="px-2 py-1.5 text-dim">{t.dueTime != null && t.notify !== false ? <Bell size={11} /> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="p-3 text-xs text-dim">Nothing here.</div>}
      </div>
      <p className="mt-2 text-[10px] text-dim">
        Project todos are each project's planned next moves; note todos are checkboxes with a date (<code>📅 2026-10-01</code> or{' '}
        <code>due:2026-10-01</code>). Ticking one here ticks it at the source.
      </p>
    </>
  )
}

function WeekGrid({
  days,
  appts,
  tasks,
  crons,
  onSelectAppt,
  onSelectTask,
  onSelectCron,
  onCreateAt,
}: {
  days: Date[]
  appts: Appt[]
  tasks: Task[]
  crons: CronJob[]
  onSelectAppt: (a: Appt) => void
  onSelectTask: (t: Task) => void
  onSelectCron: (c: CronJob) => void
  onCreateAt: (dayOffset: number, hour: number) => void
}) {
  // All 24 hours are in the grid; the hour height fits ~16h on screen and the
  // grid opens scrolled to the working part of the day (or just before now).
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hourPx, setHourPx] = useState(40)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const fit = () => setHourPx(Math.max(26, Math.min(56, Math.floor((el.clientHeight - 44) / 16))))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const scrolled = useRef(false)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || scrolled.current) return
    scrolled.current = true
    const h = new Date().getHours()
    el.scrollTop = Math.max(0, Math.min(7, h - 1)) * hourPx
  }, [hourPx])

  const hourFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const raw = DAY_START + (e.clientY - rect.top) / hourPx
    return Math.min(DAY_END - 0.25, Math.max(DAY_START, Math.round(raw * 4) / 4))
  }

  const now = new Date()
  const nowHour = now.getHours() + now.getMinutes() / 60
  const gridH = HOURS * hourPx
  // Moments (todos, cron runs) get a half-hour slot, kept inside the grid.
  const slotTop = (h: number, height: number) => Math.min((h - DAY_START) * hourPx, gridH - height - 1)

  return (
    // overscroll-contain: on phones the page around the grid also scrolls,
    // and without it a flick at the grid's top edge moves the page instead.
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto overscroll-contain">
      <div className="min-w-[720px] lg:min-w-0">
        <div className="sticky top-0 z-20 flex border-b border-line bg-bg pr-3" style={{ paddingLeft: 44 }}>
          {days.map((d) => {
            const today = isSameDay(d, TODAY)
            return (
              <div key={d.toISOString()} className="flex flex-1 items-baseline justify-center gap-1.5 py-2">
                <span className="text-[10px] uppercase tracking-wider text-dim">{format(d, 'EEE')}</span>
                <span className={`font-display text-sm ${today ? 'text-accent' : 'text-text'}`}>{format(d, 'd')}</span>
              </div>
            )
          })}
        </div>

        <div className="relative flex pr-3" style={{ height: gridH }}>
          <div className="w-[44px] shrink-0">
            {Array.from({ length: HOURS }, (_, i) => (
              <div key={i} className="relative border-t border-line/60" style={{ height: hourPx }}>
                {/* Labels sit on their hour line; midnight's goes just inside the
                 *  grid so the top of the day is visibly the top. */}
                <span className={cn('absolute left-1 text-[9px] tabular-nums text-dim', i === 0 ? 'top-0.5' : '-top-2')}>
                  {String(DAY_START + i).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
          {days.map((d) => {
            const dayAppts = appts.filter((a) => apptOccursOn(a, d))
            const dayTasks = tasks.filter((t) => t.status !== 'done' && t.dueTime != null && taskOccursOn(t, d))
            const runs = crons.flatMap((c) => cronRunHours(c).map((h) => ({ c, h })))
            const placed = layoutOverlaps([
              ...dayAppts.map((a) => ({ id: `a:${a.id}`, start: a.start, end: Math.max(a.end, a.start + 0.5) })),
              ...dayTasks.map((t) => ({ id: `t:${t.id}`, start: t.dueTime!, end: t.dueTime! + 0.5 })),
              ...runs.map(({ c, h }) => ({ id: `c:${c.id}:${h}`, start: h, end: h + 0.5 })),
            ])
            const box = (key: string) => {
              const p = placed.get(key) ?? { col: 0, cols: 1 }
              return { left: `calc(${(p.col / p.cols) * 100}% + 2px)`, width: `calc(${100 / p.cols}% - 4px)` }
            }
            const isToday = isSameDay(d, TODAY)
            const momentH = Math.max(14, hourPx / 2 - 2)
            return (
              <div
                key={d.toISOString()}
                className="relative flex-1 cursor-cell border-l border-line/60"
                onDoubleClick={(e) => onCreateAt(dayOffsetOf(d), hourFromClick(e))}
                title="Double-click to add a timed todo"
              >
                {Array.from({ length: HOURS }, (_, i) => (
                  <div key={i} className="border-t border-line/40" style={{ height: hourPx }} />
                ))}
                {dayAppts.map((a) => (
                  <ApptBlock key={a.id} appt={a} hourPx={hourPx} gridH={gridH} pos={box(`a:${a.id}`)} onClick={() => onSelectAppt(a)} />
                ))}
                {dayTasks.map((t) => (
                  <Moment
                    key={t.id}
                    color={PRIORITY_COLOR[t.priority]}
                    icon={<CheckSquare size={9} className="shrink-0" />}
                    label={t.title}
                    title={`${t.title} · ${hhmm(t.dueTime!)}`}
                    style={{ ...box(`t:${t.id}`), top: slotTop(t.dueTime!, momentH) + 1, height: momentH }}
                    onClick={() => onSelectTask(t)}
                  />
                ))}
                {runs.map(({ c, h }) => (
                  <Moment
                    key={`${c.id}:${h}`}
                    color={CRON_STATUS_COLOR[c.status]}
                    icon={<Cpu size={9} className="shrink-0" />}
                    label={c.name}
                    title={`${c.name} · ${hhmm(h)} · ${c.owner}`}
                    dashed
                    style={{ ...box(`c:${c.id}:${h}`), top: slotTop(h, momentH) + 1, height: momentH }}
                    onClick={() => onSelectCron(c)}
                  />
                ))}
                {isToday && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 border-t border-accent" style={{ top: (nowHour - DAY_START) * hourPx }}>
                    <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-accent" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type Pos = { left: string; width: string }

function Moment({
  color,
  icon,
  label,
  title,
  style,
  dashed,
  onClick,
}: {
  color: string
  icon: React.ReactNode
  label: string
  title: string
  style: React.CSSProperties
  dashed?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      onDoubleClick={(e) => e.stopPropagation()}
      title={title}
      className={cn(
        'absolute z-10 flex items-center gap-1 overflow-hidden border px-1 text-[9px] leading-none hover:z-30 hover:brightness-125',
        dashed && 'border-dashed',
      )}
      style={{ ...style, color, borderColor: `${color}66`, backgroundColor: '#11141b' }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}

function ApptBlock({ appt, hourPx, gridH, pos, onClick }: { appt: Appt; hourPx: number; gridH: number; pos: Pos; onClick: () => void }) {
  const top = (appt.start - DAY_START) * hourPx
  const height = Math.min(Math.max(16, (appt.end - appt.start) * hourPx - 2), gridH - top)
  const color = KIND_COLOR[appt.kind]
  return (
    <button
      onClick={onClick}
      onDoubleClick={(e) => e.stopPropagation()}
      title={`${appt.title} · ${hhmm(appt.start)}–${hhmm(appt.end)}`}
      className="absolute overflow-hidden border-l-2 px-1.5 py-0.5 text-left transition-all hover:z-30 hover:brightness-125"
      style={{ ...pos, top, height, backgroundColor: `${color}22`, borderColor: color }}
    >
      <div className="flex items-center gap-1 truncate text-[10px] font-medium leading-tight text-text">
        {appt.recurrence && <Repeat size={9} className="shrink-0 text-dim" />}
        {appt.title}
      </div>
      {height > 26 && (
        <div className="truncate text-[9px] leading-tight text-dim">
          {hhmm(appt.start)}–{hhmm(appt.end)}
        </div>
      )}
    </button>
  )
}

function EditModal({
  appt,
  onClose,
  onSave,
  onDelete,
}: {
  appt: Appt | null
  onClose: () => void
  onSave: (a: Appt) => void
  onDelete: (id: string) => void
}) {
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

      <div className="mb-3 grid grid-cols-2 gap-2 [&>*]:min-w-0">
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

      <div className="mb-3 grid grid-cols-2 gap-2 [&>*]:min-w-0">
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

      <RecurrenceField value={draft.recurrence} onChange={(recurrence) => setDraft({ ...draft, recurrence })} />

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
          {!draft.id.startsWith('new') && (
            <button
              onClick={() => confirm(`Delete “${draft.title}”?`) && onDelete(draft.id)}
              title="Delete"
              className="border border-line px-2 py-1.5 text-dim hover:text-danger"
            >
              <Trash2 size={12} />
            </button>
          )}
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
