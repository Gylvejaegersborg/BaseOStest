import { useState } from 'react'
import { format } from 'date-fns'
import { Eye, EyeOff, Plus } from 'lucide-react'
import { cronVisible, type CronJob } from '@/data/calendar'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import { useCalendar } from './CalendarContext'
import { CRON_STATUS_COLOR, cronNextRunMs, cronScheduleLabel } from './cron'
import { CronDetailModal } from './CronDetailModal'
import { CronEditModal } from './CronEditModal'

export function newCron(owner = 'Claude'): CronJob {
  return {
    id: `c-${Date.now().toString(36)}`,
    name: '',
    owner,
    schedule: { type: 'daily', hour: 9 },
    lastRun: 'never',
    status: 'ok',
  }
}

/**
 * The one place cron jobs are listed, created, edited, deleted and toggled
 * in/out of the calendar grid — shared by the Calendar (side panel + its
 * full-view pop-up) and the Workbench's Crons tab, so both edit the same jobs.
 */
export function CronManager({ variant = 'table', className }: { variant?: 'panel' | 'table'; className?: string }) {
  const { crons, saveCron, deleteCron } = useCalendar()
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<CronJob | null>(null)
  const open = crons.find((c) => c.id === openId) ?? null

  const toggleVisible = (c: CronJob) => saveCron({ ...c, showInCalendar: !cronVisible(c) })

  return (
    <div className={className}>
      {variant === 'table' && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-dim">
            {crons.length} jobs · {crons.filter(cronVisible).length} shown in the calendar grid
          </span>
          <button
            onClick={() => setEditing(newCron())}
            className="flex items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim hover:text-text"
          >
            <Plus size={11} /> New cron
          </button>
        </div>
      )}

      {variant === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[11px]">
            <thead className="text-[9px] uppercase tracking-wider text-dim">
              <tr className="border-b border-line">
                <th className="px-2 py-1.5 font-normal">Job</th>
                <th className="px-2 py-1.5 font-normal">Owner</th>
                <th className="px-2 py-1.5 font-normal">Schedule</th>
                <th className="px-2 py-1.5 font-normal">Next run</th>
                <th className="px-2 py-1.5 font-normal">Last run</th>
                <th className="px-2 py-1.5 text-center font-normal" title="Show its runs in the calendar grid">
                  Grid
                </th>
              </tr>
            </thead>
            <tbody>
              {crons.map((c) => {
                const shown = cronVisible(c)
                return (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer border-b border-line/40 hover:bg-panel-2/60">
                    <td className="px-2 py-1.5">
                      <span className="flex items-center gap-2">
                        <StatusDot color={CRON_STATUS_COLOR[c.status]} pulse={c.status === 'running'} size={6} />
                        <span className="text-text">{c.name}</span>
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-dim">{c.owner}</td>
                    <td className="px-2 py-1.5 text-dim">{cronScheduleLabel(c.schedule)}</td>
                    <td className="px-2 py-1.5 tabular-nums text-dim">{format(cronNextRunMs(c.schedule), 'EEE HH:mm')}</td>
                    <td className="px-2 py-1.5 text-dim">{c.lastRun}</td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleVisible(c)
                        }}
                        title={shown ? 'Shown in the calendar — click to hide' : 'Hidden from the calendar — click to show'}
                        className={cn('p-0.5', shown ? 'text-accent' : 'text-dim hover:text-text')}
                      >
                        {shown ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!crons.length && <div className="p-3 text-xs text-dim">No cron jobs yet.</div>}
        </div>
      ) : (
        <div className="space-y-1.5">
          {crons.map((c) => (
            <div
              key={c.id}
              className="flex w-full items-center gap-2 border border-line bg-bg/30 px-2 py-1.5 transition-colors hover:bg-panel-2/60"
            >
              <button onClick={() => setOpenId(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <StatusDot color={CRON_STATUS_COLOR[c.status]} pulse={c.status === 'running'} size={6} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-text">{c.name}</div>
                  <div className="text-[10px] text-dim">
                    {c.owner} · {cronScheduleLabel(c.schedule)}
                  </div>
                </div>
              </button>
              <button
                onClick={() => toggleVisible(c)}
                title={cronVisible(c) ? 'Shown in the calendar grid' : 'Hidden from the calendar grid'}
                className={cn('shrink-0 p-0.5', cronVisible(c) ? 'text-accent' : 'text-dim hover:text-text')}
              >
                {cronVisible(c) ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </div>
          ))}
          <button
            onClick={() => setEditing(newCron())}
            className="flex w-full items-center justify-center gap-1.5 border border-dashed border-line px-2 py-1.5 text-[10px] uppercase tracking-wider text-dim hover:text-text"
          >
            <Plus size={11} /> New cron
          </button>
        </div>
      )}

      {/* Detail stays open under the editor — closing the editor returns to it. */}
      <CronDetailModal job={open} onClose={() => setOpenId(null)} onEdit={(c) => setEditing(c)} />
      <CronEditModal
        job={editing}
        onClose={() => setEditing(null)}
        onSave={(c) => {
          saveCron(c)
          setEditing(null)
        }}
        onDelete={(id) => {
          deleteCron(id)
          setEditing(null)
          setOpenId(null)
        }}
      />
    </div>
  )
}
