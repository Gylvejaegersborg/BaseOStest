import { useEffect, useMemo, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { Bell, BookOpen, Bot, ExternalLink, MapPin, RefreshCw, Shuffle, Sparkles } from 'lucide-react'
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
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import { apptDate, hhmm, offsetDate } from './util'
import { cronScheduleLabel, CRON_STATUS_COLOR } from './cron'
import { dailyTrysilPlace, trysilUrl } from './trysil'
import { useDailyWikipedia, RANDOM_FALLBACK } from './useDailyWikipedia'

interface DayViewProps {
  appts: Appt[]
  tasks: Task[]
  reminders: Reminder[]
  crons: CronJob[]
  onSelectAppt: (a: Appt) => void
  onSelectTask: (t: Task) => void
  onToggleTask: (t: Task) => void
  onSelectReminder: (r: Reminder) => void
  onSelectCron: (c: CronJob) => void
}

/** Live clock that re-renders once a minute. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function greeting(h: number): string {
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DayView({
  appts,
  tasks,
  reminders,
  crons,
  onSelectAppt,
  onSelectTask,
  onToggleTask,
  onSelectReminder,
  onSelectCron,
}: DayViewProps) {
  const now = useNow()
  const nowHour = now.getHours() + now.getMinutes() / 60

  const todayAppts = useMemo(
    () => appts.filter((a) => isSameDay(apptDate(a), now)).sort((a, b) => a.start - b.start),
    [appts, now],
  )
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.dayOffset != null && isSameDay(offsetDate(t.dayOffset), now))
        .sort((a, b) => (a.dueTime ?? 99) - (b.dueTime ?? 99)),
    [tasks, now],
  )
  const todayReminders = useMemo(
    () => reminders.filter((r) => isSameDay(offsetDate(r.dayOffset), now)).sort((a, b) => a.time - b.time),
    [reminders, now],
  )

  const tasksOpen = todayTasks.filter((t) => t.status !== 'done').length
  const tasksDone = todayTasks.length - tasksOpen
  const upcomingCount = todayAppts.filter((a) => a.end > nowHour).length

  // Index of the first not-yet-finished appointment — where the "now" line goes.
  const nowIdx = todayAppts.findIndex((a) => a.end > nowHour)

  return (
    <div className="min-h-0 flex-1 overflow-auto p-3">
      {/* Hero */}
      <div className="hud-corners relative mb-3 border border-line bg-panel/60 p-4 text-accent">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="label text-dim">{greeting(now.getHours())}</div>
            <h2 className="font-display text-2xl tracking-wide text-text">{format(now, 'EEEE')}</h2>
            <div className="text-sm text-dim">{format(now, 'dd MMMM yyyy')}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl tabular-nums text-accent">{format(now, 'HH:mm')}</div>
            <div className="mt-1 text-[11px] text-dim">
              {todayAppts.length} events · {upcomingCount} upcoming · {tasksOpen} to do · {tasksDone} done
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Today's agenda */}
        <Panel title="Today" code="AGENDA" accent="#f0a020" bodyClassName="p-2">
          {todayAppts.length ? (
            <div className="space-y-1">
              {todayAppts.map((a, i) => (
                <div key={a.id}>
                  {i === nowIdx && <NowLine now={now} />}
                  <ApptRow appt={a} done={a.end <= nowHour} live={a.start <= nowHour && a.end > nowHour} onClick={() => onSelectAppt(a)} />
                </div>
              ))}
              {nowIdx === -1 && <NowLine now={now} />}
            </div>
          ) : (
            <Empty>Nothing on the agenda today.</Empty>
          )}

          {(todayTasks.length > 0 || todayReminders.length > 0) && (
            <div className="mt-3 border-t border-line pt-2">
              <div className="label mb-1.5">Due today</div>
              <div className="space-y-1">
                {todayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 border-l-2 bg-bg/40 px-2 py-1.5"
                    style={{ borderColor: PRIORITY_COLOR[t.priority] }}
                  >
                    <input
                      type="checkbox"
                      checked={t.status === 'done'}
                      onChange={() => onToggleTask(t)}
                      className="size-3.5 shrink-0 accent-neon-green"
                    />
                    <button onClick={() => onSelectTask(t)} className="min-w-0 flex-1 text-left">
                      <span className={cn('text-xs', t.status === 'done' ? 'text-dim line-through' : 'text-text')}>
                        {t.title}
                      </span>
                    </button>
                    {t.dueTime != null && <span className="text-[10px] tabular-nums text-dim">{hhmm(t.dueTime)}</span>}
                  </div>
                ))}
                {todayReminders.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSelectReminder(r)}
                    className="flex w-full items-center gap-2 border-l-2 bg-bg/40 px-2 py-1.5 text-left hover:bg-panel-2/60"
                    style={{ borderColor: REMINDER_COLOR }}
                  >
                    <Bell size={12} style={{ color: REMINDER_COLOR }} className="shrink-0" />
                    <span className={cn('min-w-0 flex-1 truncate text-xs', r.done ? 'text-dim line-through' : 'text-text')}>
                      {r.title}
                    </span>
                    <span className="text-[10px] tabular-nums text-dim">{hhmm(r.time)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* What the agents gathered */}
        <Panel
          title="Agents gathered"
          code="AGT"
          accent="#36e0c8"
          bodyClassName="p-2"
          right={<Bot size={13} className="text-dim" />}
        >
          <div className="space-y-1.5">
            {crons.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCron(c)}
                className="block w-full border border-line bg-bg/30 px-2 py-1.5 text-left transition-colors hover:bg-panel-2/60"
              >
                <div className="flex items-center gap-2">
                  <StatusDot color={CRON_STATUS_COLOR[c.status]} pulse={c.status === 'running'} size={6} />
                  <span className="min-w-0 flex-1 truncate text-xs text-text">{c.name}</span>
                  <span className="text-[9px] text-dim">{c.lastRun}</span>
                </div>
                {c.outputs && c.outputs.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1 pl-4">
                    {c.outputs.map((o, i) => (
                      <span key={i} className="border border-line/60 px-1 py-0.5 text-[9px] text-dim">
                        {o}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-0.5 pl-4 text-[9px] text-dim/70">{c.owner} · {cronScheduleLabel(c.schedule)}</div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Daily Wikipedia */}
        <WikipediaCard />

        {/* Daily Trysil place */}
        <TrysilCard now={now} />
      </div>
    </div>
  )
}

function NowLine({ now }: { now: Date }) {
  return (
    <div className="flex items-center gap-2 py-1" aria-label="current time">
      <span className="text-[9px] font-medium tabular-nums text-accent">{format(now, 'HH:mm')}</span>
      <span className="h-px flex-1 bg-accent/60" />
      <StatusDot color="#36e0c8" pulse size={5} />
    </div>
  )
}

function ApptRow({ appt, done, live, onClick }: { appt: Appt; done: boolean; live: boolean; onClick: () => void }) {
  const color = KIND_COLOR[appt.kind]
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 border-l-2 px-2 py-1.5 text-left transition-colors hover:bg-panel-2/60',
        live ? 'bg-accent/10' : 'bg-bg/40',
        done && 'opacity-45',
      )}
      style={{ borderColor: color }}
    >
      <span className="w-20 shrink-0 text-[10px] tabular-nums text-dim">
        {hhmm(appt.start)}–{hhmm(appt.end)}
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-xs', done ? 'text-dim line-through' : 'text-text')}>
        {appt.title}
      </span>
      {appt.location && (
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-dim">
          <MapPin size={9} /> {appt.location}
        </span>
      )}
      {live && <span className="shrink-0 text-[9px] uppercase tracking-wider text-accent">now</span>}
    </button>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-3 text-xs text-dim">{children}</div>
}

function WikipediaCard() {
  const { data, status, reroll } = useDailyWikipedia()
  return (
    <Panel
      title="Daily Wikipedia"
      code="WIKI"
      accent="#c8d2dc"
      bodyClassName="p-3"
      right={
        <button onClick={reroll} title="Reroll" className="text-dim hover:text-text">
          <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} />
        </button>
      }
    >
      {status === 'loading' && <div className="py-4 text-center text-xs text-dim">Fetching something to learn…</div>}

      {status === 'error' && (
        <div className="text-xs text-dim">
          Couldn’t reach Wikipedia.{' '}
          <a href={RANDOM_FALLBACK} target="_blank" rel="noopener noreferrer" className="text-accent underline">
            Open a random article ↗
          </a>
        </div>
      )}

      {status === 'ready' && data && (
        <div className="flex gap-3">
          {data.thumbnail && (
            <img src={data.thumbnail} alt="" className="h-16 w-16 shrink-0 border border-line object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <BookOpen size={12} className="shrink-0 text-accent" />
              <h3 className="truncate font-display text-sm text-text">{data.title}</h3>
            </div>
            <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-dim">{data.extract}</p>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-accent hover:underline"
            >
              Read on Wikipedia <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}
    </Panel>
  )
}

function TrysilCard({ now }: { now: Date }) {
  const [offset, setOffset] = useState(0)
  const place = dailyTrysilPlace(now, offset)
  return (
    <Panel
      title="Trysil place of the day"
      code="TN"
      accent="#46d369"
      bodyClassName="p-3"
      right={
        <button onClick={() => setOffset((o) => o + 1)} title="Another place" className="text-dim hover:text-text">
          <Shuffle size={13} />
        </button>
      }
    >
      <div className="flex items-start gap-1.5">
        <Sparkles size={12} className="mt-0.5 shrink-0 text-neon-green" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base text-text">{place.name}</h3>
          <div className="text-[11px] text-dim">{place.kind} · Trysil, Norway</div>
          <a
            href={trysilUrl(place.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-neon-green hover:underline"
          >
            <MapPin size={10} /> Explore on trysilnavn.no <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </Panel>
  )
}
