import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { AgendaList } from './AgendaList'
import { buildAgenda } from './agenda'
import { useCalendar } from './CalendarContext'

/**
 * Compact "Up Next" readout for the Home constellation — same live agenda data
 * as the Calendar's Up Next panel (appointments + timed tasks).
 */
export function HomeAgenda() {
  const navigate = useNavigate()
  const { appts, tasks, reminders, crons } = useCalendar()
  const items = useMemo(
    () => buildAgenda({ appts, tasks, reminders, crons }, 5),
    [appts, tasks, reminders, crons],
  )

  return (
    <div className="absolute right-4 top-4 z-10 hidden w-[260px] sm:block">
      <div className="hud-corners relative border border-line bg-panel/85 p-3 backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="label text-amber">UP NEXT</span>
          <button
            onClick={() => navigate('/calendar')}
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-dim transition-colors hover:text-accent"
          >
            <CalendarDays size={11} /> Calendar
          </button>
        </div>
        <AgendaList items={items} onSelect={() => navigate('/calendar')} emptyText="Clear ahead — nothing scheduled." />
      </div>
    </div>
  )
}
