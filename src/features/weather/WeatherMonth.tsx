import { useMemo } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { DayForecast } from './types'
import type { LocationMeta } from './locations'
import { climatologyDay } from './mockData'
import { WeatherSymbol } from './WeatherSymbol'
import { cn } from '@/lib/cn'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Monthly grid mirroring the Calendar's MonthView: each cell shows the day's
 *  symbol and hi/lo. Real forecast days are crisp; the rest fall back to a
 *  climatology estimate so the whole month stays readable. */
export function WeatherMonth({
  month,
  loc,
  days,
  onSelectDay,
}: {
  month: Date
  loc: LocationMeta
  days: DayForecast[]
  onSelectDay?: (d: DayForecast) => void
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] uppercase tracking-wider text-dim">
            {d}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 overflow-auto" style={{ gridAutoRows: 'minmax(78px, 1fr)' }}>
        {grid.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const fc = byDate.get(key) ?? climatologyDay(loc, day)
          const inMonth = isSameMonth(day, month)
          const today = isToday(day)
          return (
            <button
              key={key}
              onClick={() => onSelectDay?.(fc)}
              className={cn(
                'flex flex-col items-stretch gap-1 border-b border-r border-line/50 p-1.5 text-left transition-colors',
                today ? 'bg-accent/5' : 'hover:bg-panel-2/40',
                !inMonth && 'opacity-35',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('font-display text-sm', today ? 'text-accent' : inMonth ? 'text-text' : 'text-dim')}>
                  {format(day, 'd')}
                </span>
                {fc.precipSum > 0 && <span className="text-[8px] text-accent">{fc.precipSum}mm</span>}
              </div>
              <div className="flex items-center justify-center py-0.5">
                <WeatherSymbol code={fc.symbol} size={22} />
              </div>
              <div className="flex items-center justify-center gap-1 text-[10px] tabular-nums">
                <span className="text-text">{fc.max}°</span>
                <span className="text-dim">{fc.min}°</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
