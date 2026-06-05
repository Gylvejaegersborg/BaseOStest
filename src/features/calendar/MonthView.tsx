import { useMemo } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { KIND_COLOR, PRIORITY_COLOR, type Appt, type Task } from '@/data/calendar'
import { cn } from '@/lib/cn'
import { apptDate, hhmm, offsetDate } from './util'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface MonthViewProps {
  month: Date
  appts: Appt[]
  tasks: Task[]
  onSelectDay: (day: Date) => void
  onSelectAppt: (appt: Appt) => void
}

export function MonthView({ month, appts, tasks, onSelectDay, onSelectAppt }: MonthViewProps) {
  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [month])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] uppercase tracking-wider text-dim">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        className="grid min-h-0 flex-1 grid-cols-7 overflow-auto"
        style={{ gridAutoRows: 'minmax(96px, 1fr)' }}
      >
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const today = isToday(day)
          const dayAppts = appts
            .filter((a) => isSameDay(apptDate(a), day))
            .sort((a, b) => a.start - b.start)
          const dayTasks = tasks.filter(
            (t) => t.dayOffset != null && t.status !== 'done' && isSameDay(offsetDate(t.dayOffset), day),
          )

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={cn(
                'flex flex-col gap-1 border-b border-r border-line/50 p-1.5 text-left transition-colors',
                today ? 'bg-accent/5' : 'hover:bg-panel-2/40',
                !inMonth && 'opacity-35',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'font-display text-sm',
                    today ? 'text-accent' : inMonth ? 'text-text' : 'text-dim',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && (
                  <span
                    className="text-[9px] tabular-nums"
                    style={{ color: PRIORITY_COLOR[dayTasks[0].priority] }}
                    title={`${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''} due`}
                  >
                    ◷ {dayTasks.length}
                  </span>
                )}
              </div>

              <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
                {dayAppts.slice(0, 3).map((a) => (
                  <span
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectAppt(a)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        onSelectAppt(a)
                      }
                    }}
                    className="truncate border-l-2 px-1 text-[9px] leading-tight text-text/90 hover:brightness-125"
                    style={{ borderColor: KIND_COLOR[a.kind], backgroundColor: `${KIND_COLOR[a.kind]}1a` }}
                  >
                    <span className="text-dim">{hhmm(a.start)}</span> {a.title}
                  </span>
                ))}
                {dayAppts.length > 3 && (
                  <span className="px-1 text-[9px] text-dim">+{dayAppts.length - 3} more</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
