import { useMemo, useState } from 'react'
import {
  addMonths,
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
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface MiniMonthPickerProps {
  /** The currently selected day, also seeds which month opens first. */
  value: Date
  onSelect: (day: Date) => void
  /** Whether a given day has anything on it (appt/task/reminder, recurring
   *  ones included) — a dot hint while browsing months. */
  isDayMarked?: (day: Date) => boolean
}

/** Compact month-grid date picker — the thing Day view was missing:
 *  Day view could only ever show today, with no way to cross a month
 *  boundary or land on an arbitrary date. This is deliberately lighter than
 *  MonthView (no per-day event previews) since it's a jump-to-date control,
 *  not a second calendar surface. */
export function MiniMonthPicker({ value, onSelect, isDayMarked }: MiniMonthPickerProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(value))

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  return (
    <div className="w-[260px] border border-line-2 bg-panel p-2.5 shadow-glow">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="border border-line p-1 text-dim hover:text-text"
          aria-label="Previous month"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="font-display text-xs tracking-wider text-text">{format(cursor, 'MMMM yyyy')}</span>
        <button
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="border border-line p-1 text-dim hover:text-text"
          aria-label="Next month"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-0.5 text-center text-[9px] uppercase tracking-wider text-dim">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor)
          const selected = isSameDay(day, value)
          const today = isToday(day)
          const marked = isDayMarked?.(day)
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={cn(
                'relative py-1 text-center text-[11px] tabular-nums transition-colors',
                selected ? 'bg-accent text-bg' : today ? 'text-accent' : inMonth ? 'text-text hover:bg-panel-2' : 'text-dim/50 hover:bg-panel-2',
              )}
            >
              {format(day, 'd')}
              {marked && !selected && (
                <span className="absolute bottom-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-accent" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
