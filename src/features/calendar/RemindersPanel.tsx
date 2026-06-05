import { format } from 'date-fns'
import { Bell, BellOff, BellRing, Send } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { StatusDot } from '@/components/ui/StatusDot'
import { untilLabel } from './util'
import type { NotifyPermission } from './notifications'
import type { ScheduledReminder } from './useReminders'

interface RemindersPanelProps {
  enabled: boolean
  permission: NotifyPermission
  scheduled: ScheduledReminder[]
  onToggle: () => void
  onEnableNotifications: () => void
  onTest: () => void
}

export function RemindersPanel({
  enabled,
  permission,
  scheduled,
  onToggle,
  onEnableNotifications,
  onTest,
}: RemindersPanelProps) {
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
        {permission !== 'granted' && permission !== 'unsupported' && permission !== 'denied' && (
          <button
            onClick={onEnableNotifications}
            className="flex items-center gap-1 border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent hover:bg-panel-2/60"
          >
            <Bell size={10} /> Enable
          </button>
        )}
      </div>

      {/* Next scheduled pings */}
      {scheduled.length ? (
        <div className="space-y-1">
          {scheduled.map((r) => (
            <div key={`${r.source}:${r.refId}`} className="flex items-center gap-2 px-1 py-1">
              <StatusDot color={r.color} size={5} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] text-text">{r.title}</div>
                <div className="text-[9px] text-dim">
                  pings {untilLabel(r.fireAt)} · {format(r.startAt, 'EEE HH:mm')}
                </div>
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
