import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { buildAgenda, type AgendaItem } from './agenda'
import { useCalendar } from './CalendarContext'
import { hhmm } from './util'
import { cn } from '@/lib/cn'
import { cronVisible } from '@/data/calendar'

const WINDOW_BEFORE_H = 1
const WINDOW_AFTER_H = 11
const KEY = 'os:home:timeline-open'

function until(ms: number): string {
  const m = Math.round(ms / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `in ${m}m`
  const h = Math.floor(m / 60)
  return `in ${h}h${m % 60 ? ` ${m % 60}m` : ''}`
}

/**
 * The constellation's "Up Next": a slim strip along the bottom edge instead
 * of a panel over the suns. Collapsed it's one line (the next thing); open,
 * it's a mini calendar row — the next ~12 hours on a horizontal timeline
 * with a now-marker, same data as the Calendar's agenda.
 */
export function HomeTimeline() {
  const navigate = useNavigate()
  const { appts, tasks, crons } = useCalendar()
  const [now, setNow] = useState(() => Date.now())
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== '0'
    } catch {
      return true
    }
  })
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(id)
  }, [])
  const toggle = () =>
    setOpen((o) => {
      try {
        localStorage.setItem(KEY, o ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !o
    })

  const start = now - WINDOW_BEFORE_H * 3600_000
  const end = now + WINDOW_AFTER_H * 3600_000
  const items = useMemo(
    () => buildAgenda({ appts, tasks, crons: crons.filter(cronVisible) }, 40, start).filter((i) => i.when <= end),
    [appts, tasks, crons, start, end],
  )
  const next = items.find((i) => i.when >= now) ?? null
  const x = (ms: number) => ((ms - start) / (end - start)) * 100

  // Stack chips that would overlap onto separate rows (max 3).
  const rows: AgendaItem[][] = [[], [], []]
  const lastX = [-100, -100, -100]
  for (const it of items) {
    const px = x(it.when)
    const r = lastX.findIndex((l) => px - l > 11)
    const row = r === -1 ? 2 : r
    rows[row].push(it)
    lastX[row] = px
  }

  const hours: number[] = []
  const first = new Date(start)
  first.setMinutes(0, 0, 0)
  for (let t = first.getTime() + 3600_000; t < end; t += 3600_000) hours.push(t)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-2 pb-2 sm:px-4 sm:pb-3">
      <div className="pointer-events-auto mx-auto max-w-5xl border border-line bg-panel/80 backdrop-blur-md">
        <div className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
          <span className="label text-amber">UP NEXT</span>
          {next ? (
            <button onClick={() => navigate('/calendar')} className="flex min-w-0 items-center gap-1.5 text-left">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: next.color }} />
              <span className="truncate text-text">{next.title}</span>
              <span className="shrink-0 tabular-nums text-dim">
                {hhmm(next.hour)} · {until(next.when - now)}
              </span>
            </button>
          ) : (
            <span className="text-dim">Clear ahead — nothing in the next {WINDOW_AFTER_H} hours.</span>
          )}
          <button onClick={() => navigate('/calendar')} className="ml-auto flex shrink-0 items-center gap-1 text-dim hover:text-accent" title="Open calendar">
            <CalendarDays size={12} />
          </button>
          <button onClick={toggle} className="shrink-0 text-dim hover:text-text" aria-label={open ? 'Collapse timeline' : 'Expand timeline'}>
            {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
        {open && (
          <div className="relative mx-3 mb-2 h-[74px] border-t border-line/70">
            {hours.map((t) => (
              <div key={t} className="absolute top-0 h-full border-l border-line/40" style={{ left: `${x(t)}%` }}>
                <span className="absolute -top-0 left-1 text-[9px] tabular-nums text-dim/80">
                  {String(new Date(t).getHours()).padStart(2, '0')}
                </span>
              </div>
            ))}
            <div className="absolute top-0 z-10 h-full border-l border-accent" style={{ left: `${x(now)}%` }}>
              <span className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-accent" />
            </div>
            {rows.map((row, r) =>
              row.map((it) => {
                const left = x(it.when)
                const width = it.endHour != null ? Math.max(0, x(it.when + (it.endHour - it.hour) * 3600_000) - left) : 0
                const past = it.when < now
                return (
                  <button
                    key={it.id}
                    onClick={() => navigate('/calendar')}
                    title={`${it.title} · ${hhmm(it.hour)}`}
                    className={cn(
                      'absolute flex h-[18px] max-w-[160px] items-center gap-1 overflow-hidden border-l-2 px-1 text-[10px] leading-none transition-colors hover:brightness-125',
                      past && 'opacity-50',
                    )}
                    style={{
                      left: `${left}%`,
                      top: 14 + r * 20,
                      minWidth: width ? `${width}%` : undefined,
                      borderColor: it.color,
                      backgroundColor: `${it.color}22`,
                    }}
                  >
                    <span className="truncate text-text/90">{it.title}</span>
                  </button>
                )
              }),
            )}
          </div>
        )}
      </div>
    </div>
  )
}
