import { format } from 'date-fns'
import { StatusDot } from '@/components/ui/StatusDot'
import { hhmm } from './util'
import type { AgendaItem } from './agenda'

interface AgendaListProps {
  items: AgendaItem[]
  onSelect: (item: AgendaItem) => void
  emptyText?: string
}

function metaLine(it: AgendaItem): string {
  switch (it.source) {
    case 'appt':
      return `${hhmm(it.hour)}–${hhmm(it.endHour ?? it.hour)}`
    case 'task':
      return `due ${hhmm(it.hour)} · task`
    case 'cron':
      return `${hhmm(it.hour)} · cron`
    case 'reminder':
      return `${hhmm(it.hour)} · reminder`
  }
}

export function AgendaList({ items, onSelect, emptyText = 'Nothing upcoming.' }: AgendaListProps) {
  if (!items.length) return <div className="px-2 py-3 text-xs text-dim">{emptyText}</div>
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onSelect(it)}
          className="flex w-full items-center gap-2 border-l-2 bg-bg/40 px-2 py-2 text-left hover:bg-panel-2/60"
          style={{ borderColor: it.color }}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-text">{it.title}</div>
            <div className="text-[10px] text-dim">
              {format(it.date, 'EEE')} · {metaLine(it)}
            </div>
          </div>
          <StatusDot color={it.color} size={6} />
        </button>
      ))}
    </div>
  )
}
