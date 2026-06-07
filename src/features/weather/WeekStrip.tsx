import { format, isToday, parseISO } from 'date-fns'
import { Umbrella, Wind } from 'lucide-react'
import type { DayForecast } from './types'
import { WeatherSymbol, symbolInfo } from './WeatherSymbol'
import { cn } from '@/lib/cn'

/** Long-term outlook as rows with a relative temperature range bar — the
 *  weekly read, styled like the rest of the OS. */
export function WeekStrip({ days, onSelectDay }: { days: DayForecast[]; onSelectDay?: (d: DayForecast) => void }) {
  const lo = Math.min(...days.map((d) => d.min))
  const hi = Math.max(...days.map((d) => d.max))
  const span = Math.max(1, hi - lo)
  const pct = (t: number) => ((t - lo) / span) * 100

  return (
    <div className="divide-y divide-line/60 border border-line">
      {days.map((d) => {
        const date = parseISO(d.date)
        const today = isToday(date)
        const left = pct(d.min)
        const width = Math.max(6, pct(d.max) - pct(d.min))
        return (
          <button
            key={d.date}
            onClick={() => onSelectDay?.(d)}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-panel-2/50',
              today && 'bg-accent/5',
            )}
          >
            <div className="w-12 shrink-0">
              <div className={cn('font-display text-sm', today ? 'text-accent' : 'text-text')}>
                {today ? 'Today' : format(date, 'EEE')}
              </div>
              <div className="text-[10px] text-dim">{format(date, 'd MMM')}</div>
            </div>

            <WeatherSymbol code={d.symbol} size={26} />

            <div className="flex w-14 shrink-0 flex-col text-[10px] text-dim">
              <span className="flex items-center gap-1" style={{ color: d.precipSum > 0 ? symbolInfo('rain').tone : undefined }}>
                <Umbrella size={10} /> {d.precipSum > 0 ? `${d.precipSum} mm` : '—'}
              </span>
              <span className="flex items-center gap-1">
                <Wind size={10} /> {Math.round(d.windMax)} m/s
              </span>
            </div>

            {/* relative temperature range bar */}
            <div className="flex flex-1 items-center gap-2">
              <span className="w-7 text-right text-xs text-dim tabular-nums">{d.min}°</span>
              <div className="relative h-1.5 flex-1 rounded-full bg-line">
                <div
                  className="absolute h-1.5 rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: 'linear-gradient(90deg,#58b6f0,#f0a020)',
                  }}
                />
              </div>
              <span className="w-7 text-xs text-text tabular-nums">{d.max}°</span>
            </div>

            {!d.forecast && <span className="ml-1 text-[8px] uppercase tracking-wider text-dim">est</span>}
          </button>
        )
      })}
    </div>
  )
}
