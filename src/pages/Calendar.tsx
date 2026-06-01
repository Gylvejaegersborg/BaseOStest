import { useMemo, useState } from 'react'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { APPOINTMENTS, CRON_JOBS, KIND_COLOR, type Appt } from '@/data/calendar'
import { Panel } from '@/components/ui/Panel'
import { Modal } from '@/components/ui/Modal'
import { StatusDot } from '@/components/ui/StatusDot'

const DAY_START = 7
const DAY_END = 22
const HOUR_PX = 46
const TODAY = new Date()

function apptDate(a: Appt) {
  return addDays(TODAY, a.dayOffset)
}
function hhmm(h: number) {
  const hr = Math.floor(h)
  const mn = Math.round((h - hr) * 60)
  return `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`
}

export function Calendar() {
  const [appts, setAppts] = useState<Appt[]>(() => {
    try {
      const stored = localStorage.getItem('os:calendar:appts')
      return stored ? JSON.parse(stored) : APPOINTMENTS
    } catch { return APPOINTMENTS }
  })
  const [weekOffset, setWeekOffset] = useState(0)
  const [editing, setEditing] = useState<Appt | null>(null)

  const weekStart = useMemo(
    () => addDays(startOfWeek(TODAY, { weekStartsOn: 1 }), weekOffset * 7),
    [weekOffset],
  )
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const upNext = useMemo(() => {
    const now = TODAY.getTime()
    return appts
      .map((a) => ({ a, t: apptDate(a).setHours(Math.floor(a.start), (a.start % 1) * 60, 0, 0) }))
      .filter((x) => x.t >= now)
      .sort((x, y) => x.t - y.t)
      .slice(0, 3)
      .map((x) => x.a)
  }, [appts])

  const save = (updated: Appt) => {
    setAppts((list) => {
      const next = list.map((a) => (a.id === updated.id ? updated : a))
      localStorage.setItem('os:calendar:appts', JSON.stringify(next))
      return next
    })
    setEditing(null)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* Calendar grid */}
      <div className="flex h-[72vh] min-w-0 flex-col lg:h-auto lg:flex-1">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg tracking-wider text-text">CALENDAR</h1>
            <span className="text-xs text-dim">
              {format(weekStart, 'dd MMM')} – {format(addDays(weekStart, 6), 'dd MMM yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset((w) => w - 1)} className="border border-line p-1 text-dim hover:text-text">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setWeekOffset(0)} className="border border-line px-2 py-1 text-[11px] uppercase tracking-wider text-dim hover:text-text">
              Today
            </button>
            <button onClick={() => setWeekOffset((w) => w + 1)} className="border border-line p-1 text-dim hover:text-text">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Headers + grid share one scroll area so columns stay aligned; min-width forces
            horizontal scroll on narrow phones instead of crushing the 7 columns. */}
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
                    <ApptBlock key={a.id} appt={a} onClick={() => setEditing(a)} />
                  ))}
                </div>
              )
            })}
            </div>
          </div>
        </div>
      </div>

      {/* Side panels */}
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t border-line bg-panel/30 p-3 lg:w-[300px] lg:border-l lg:border-t-0">
        <Panel title="Up Next" code="TOP 3" accent="#f0a020" bodyClassName="p-2">
          <div className="space-y-2">
            {upNext.length ? (
              upNext.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setEditing(a)}
                  className="flex w-full items-center gap-2 border-l-2 bg-bg/40 px-2 py-2 text-left hover:bg-panel-2/60"
                  style={{ borderColor: KIND_COLOR[a.kind] }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-text">{a.title}</div>
                    <div className="text-[10px] text-dim">
                      {format(apptDate(a), 'EEE')} · {hhmm(a.start)}–{hhmm(a.end)}
                    </div>
                  </div>
                  <StatusDot color={KIND_COLOR[a.kind]} size={6} />
                </button>
              ))
            ) : (
              <div className="px-2 py-3 text-xs text-dim">Nothing upcoming this view.</div>
            )}
          </div>
        </Panel>

        <Panel title="AI Cron Jobs" code="AGT" accent="#36e0c8" bodyClassName="p-2">
          <div className="space-y-1.5">
            {CRON_JOBS.map((c) => (
              <div key={c.id} className="flex items-center gap-2 border border-line bg-bg/30 px-2 py-1.5">
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
              </div>
            ))}
          </div>
        </Panel>
      </aside>

      <EditModal appt={editing} onClose={() => setEditing(null)} onSave={save} />
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
  // sync when a new appt opens
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

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div>
          <label className="label mb-1 block">Start</label>
          <input
            type="number"
            step="0.5"
            value={draft.start}
            onChange={(e) => setDraft({ ...draft, start: Number(e.target.value) })}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          />
        </div>
        <div>
          <label className="label mb-1 block">End</label>
          <input
            type="number"
            step="0.5"
            value={draft.end}
            onChange={(e) => setDraft({ ...draft, end: Number(e.target.value) })}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          />
        </div>
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
