import { useState } from 'react'
import { format } from 'date-fns'
import { Bell, BellOff, BellRing, Plus, Send } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { StatusDot } from '@/components/ui/StatusDot'
import { hhmm, parseHM } from './util'
import type { NotifyPermission } from './notifications'
import type { ScheduledReminder } from './useReminders'

interface RemindersPanelProps {
  enabled: boolean
  permission: NotifyPermission
  scheduled: ScheduledReminder[]
  onToggle: () => void
  onEnableNotifications: () => void
  onTest: () => void
  onAddReminder: (title: string, dayOffset: number, time: number) => void
}

function nextHour(): number {
  return Math.min(23, new Date().getHours() + 1)
}

export function RemindersPanel({
  enabled,
  permission,
  scheduled,
  onToggle,
  onEnableNotifications,
  onTest,
  onAddReminder,
}: RemindersPanelProps) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(0)
  const [time, setTime] = useState(() => nextHour())

  const submit = () => {
    if (!title.trim()) return
    onAddReminder(title.trim(), day, time)
    setTitle('')
    setDay(0)
    setTime(nextHour())
    setAdding(false)
  }

  return (
    <Panel
      title="Reminders"
      code="PUSH"
      accent="#9b7bff"
      bodyClassName="p-2"
      right={
        <button
          onClick={onToggle}
          title={enabled ? 'Mute reminders' : 'Unmute reminders'}
          className={enabled ? 'text-accent' : 'text-dim hover:text-text'}
        >
          {enabled ? <BellRing size={14} /> : <BellOff size={14} />}
        </button>
      }
    >
      {/* Notification permission state */}
      <div className="mb-2 flex items-center gap-2 border border-line bg-bg/30 px-2 py-1.5">
        <StatusDot
          color={permission === 'granted' ? '#46d369' : permission === 'denied' ? '#ff5566' : '#6b7785'}
          size={6}
          pulse={enabled && permission === 'granted'}
        />
        <div className="min-w-0 flex-1 text-[10px] text-dim">
          {permission === 'granted' && (enabled ? 'Push notifications on' : 'Push allowed · muted')}
          {permission === 'default' && 'In-app nudges only'}
          {permission === 'denied' && 'Push blocked by browser'}
          {permission === 'unsupported' && 'Push not supported here'}
        </div>
        {permission === 'default' && (
          <button
            onClick={onEnableNotifications}
            className="flex items-center gap-1 border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent hover:bg-panel-2/60"
          >
            <Bell size={10} /> Enable
          </button>
        )}
      </div>

      {/* Quick-add reminder */}
      {adding ? (
        <div className="mb-2 space-y-1.5 border border-line bg-bg/30 p-2">
          <input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') setAdding(false)
            }}
            placeholder="Remind me to…"
            className="w-full border border-line bg-bg/60 px-2 py-1 text-xs text-text focus:border-accent/60 focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="flex-1 border border-line bg-bg/60 px-1.5 py-1 text-xs text-text focus:border-accent/60 focus:outline-none"
            >
              <option value={0}>Today</option>
              <option value={1}>Tomorrow</option>
              <option value={2}>In 2 days</option>
              <option value={7}>In a week</option>
            </select>
            <input
              type="time"
              value={hhmm(time)}
              onChange={(e) => {
                const h = parseHM(e.target.value)
                if (h != null) setTime(h)
              }}
              className="border border-line bg-bg/60 px-1.5 py-1 text-xs text-text focus:border-accent/60 focus:outline-none [color-scheme:dark]"
            />
          </div>
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => setAdding(false)}
              className="border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim hover:text-text"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!title.trim()}
              className="border border-[#9b7bff66] px-2 py-1 text-[10px] uppercase tracking-wider text-[#9b7bff] disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mb-2 flex w-full items-center justify-center gap-1.5 border border-dashed border-line px-2 py-1.5 text-[10px] uppercase tracking-wider text-dim hover:text-text"
        >
          <Plus size={11} /> New reminder
        </button>
      )}

      {/* Next scheduled pings */}
      {scheduled.length ? (
        <div className="space-y-1">
          {scheduled.map((r) => (
            <div key={`${r.source}:${r.refId}`} className="flex items-center gap-2 px-1 py-1">
              <StatusDot color={r.color} size={5} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] text-text">{r.title}</div>
                <div className="text-[9px] text-dim">{format(r.startAt, 'EEE HH:mm')}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-1 py-2 text-[11px] text-dim">No upcoming reminders.</div>
      )}

      <button
        onClick={onTest}
        className="mt-2 flex w-full items-center justify-center gap-1.5 border border-line px-2 py-1.5 text-[10px] uppercase tracking-wider text-dim hover:text-text"
      >
        <Send size={11} /> Send test reminder
      </button>
    </Panel>
  )
}
