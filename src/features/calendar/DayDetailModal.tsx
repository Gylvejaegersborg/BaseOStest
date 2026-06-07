import { format, isSameDay } from 'date-fns'
import { Bell, CalendarRange, Clock, MapPin } from 'lucide-react'
import {
  KIND_COLOR,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  REMINDER_COLOR,
  type Appt,
  type Reminder,
  type Task,
} from '@/data/calendar'
import { Modal } from '@/components/ui/Modal'
import { StatusDot } from '@/components/ui/StatusDot'
import { apptDate, hhmm, offsetDate } from './util'

interface DayDetailModalProps {
  day: Date | null
  appts: Appt[]
  tasks: Task[]
  reminders: Reminder[]
  onClose: () => void
  onSelectAppt: (appt: Appt) => void
  onSelectReminder: (reminder: Reminder) => void
  onToggleTask: (task: Task) => void
  onOpenWeek: (day: Date) => void
}

export function DayDetailModal({
  day,
  appts,
  tasks,
  reminders,
  onClose,
  onSelectAppt,
  onSelectReminder,
  onToggleTask,
  onOpenWeek,
}: DayDetailModalProps) {
  if (!day) return null

  const dayAppts = appts.filter((a) => isSameDay(apptDate(a), day)).sort((a, b) => a.start - b.start)
  const dayTasks = tasks.filter((t) => t.dayOffset != null && isSameDay(offsetDate(t.dayOffset), day))
  const dayReminders = reminders
    .filter((r) => !r.done && isSameDay(offsetDate(r.dayOffset), day))
    .sort((a, b) => a.time - b.time)

  return (
    <Modal open={!!day} onClose={onClose} title={format(day, 'EEEE')} code={format(day, 'dd MMM yyyy')} accent="#f0a020" width={460}>
      <button
        onClick={() => onOpenWeek(day)}
        className="mb-4 flex items-center gap-1.5 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim hover:text-text"
      >
        <CalendarRange size={12} /> Open week
      </button>

      <div className="label mb-1.5">Appointments</div>
      {dayAppts.length ? (
        <div className="mb-4 space-y-1.5">
          {dayAppts.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelectAppt(a)}
              className="flex w-full items-center gap-2 border-l-2 bg-bg/40 px-2 py-2 text-left hover:bg-panel-2/60"
              style={{ borderColor: KIND_COLOR[a.kind] }}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-text">{a.title}</div>
                <div className="flex items-center gap-3 text-[10px] text-dim">
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {hhmm(a.start)}–{hhmm(a.end)}
                  </span>
                  {a.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} /> {a.location}
                    </span>
                  )}
                </div>
              </div>
              <StatusDot color={KIND_COLOR[a.kind]} size={6} />
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-4 px-1 py-2 text-xs text-dim">No appointments.</div>
      )}

      <div className="label mb-1.5">Tasks due</div>
      {dayTasks.length ? (
        <div className="space-y-1.5">
          {dayTasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 border-l-2 bg-bg/40 px-2 py-2"
              style={{ borderColor: PRIORITY_COLOR[t.priority] }}
            >
              <input
                type="checkbox"
                checked={t.status === 'done'}
                onChange={() => onToggleTask(t)}
                className="size-3.5 shrink-0 accent-neon-green"
              />
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm ${t.status === 'done' ? 'text-dim line-through' : 'text-text'}`}>
                  {t.title}
                </div>
                <div className="text-[10px] text-dim">
                  {PRIORITY_LABEL[t.priority]}
                  {t.dueTime != null && ` · due ${hhmm(t.dueTime)}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 px-1 py-2 text-xs text-dim">No tasks due.</div>
      )}

      <div className="label mb-1.5">Reminders</div>
      {dayReminders.length ? (
        <div className="space-y-1.5">
          {dayReminders.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelectReminder(r)}
              className="flex w-full items-center gap-2 border-l-2 bg-bg/40 px-2 py-2 text-left hover:bg-panel-2/60"
              style={{ borderColor: REMINDER_COLOR }}
            >
              <Bell size={12} style={{ color: REMINDER_COLOR }} className="shrink-0" />
              <div className="min-w-0 flex-1 truncate text-sm text-text">{r.title}</div>
              <span className="text-[10px] tabular-nums text-dim">{hhmm(r.time)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-1 py-2 text-xs text-dim">No reminders.</div>
      )}
    </Modal>
  )
}
