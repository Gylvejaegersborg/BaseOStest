import { Activity, ArrowRight, Clock, Pencil, CheckCircle2, User } from 'lucide-react'
import { format } from 'date-fns'
import type { CronJob } from '@/data/calendar'
import { Modal } from '@/components/ui/Modal'
import { StatusDot } from '@/components/ui/StatusDot'
import { untilLabel } from './util'
import { CRON_STATUS_COLOR, cronNextRunMs, cronScheduleLabel } from './cron'

const RUN_COLOR: Record<'ok' | 'warn' | 'fail', string> = {
  ok: '#46d369',
  warn: '#f0a020',
  fail: '#ff5566',
}

export function CronDetailModal({
  job,
  onClose,
  onEdit,
}: {
  job: CronJob | null
  onClose: () => void
  onEdit: (job: CronJob) => void
}) {
  if (!job) return null
  const color = CRON_STATUS_COLOR[job.status]
  const nextRun = cronNextRunMs(job.schedule)

  return (
    <Modal open={!!job} onClose={onClose} title={job.name} code={`CRON.${job.id.toUpperCase()}`} accent={color} width={480}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <StatusDot color={color} pulse={job.status === 'running'} size={7} />
          <span className="text-xs uppercase tracking-wider" style={{ color }}>
            {job.status === 'running' ? 'Running now' : job.status === 'warn' ? 'Needs attention' : 'Healthy'}
          </span>
        </span>
        <button
          onClick={() => onEdit(job)}
          className="flex items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim hover:text-text"
        >
          <Pencil size={11} /> Edit
        </button>
      </div>

      {job.description && <p className="mb-4 text-sm leading-relaxed text-text/90">{job.description}</p>}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Stat icon={<User size={12} />} label="Owner" value={job.owner} />
        <Stat icon={<Clock size={12} />} label="Schedule" value={cronScheduleLabel(job.schedule)} />
        <Stat icon={<ArrowRight size={12} />} label="Next run" value={`${format(nextRun, 'EEE HH:mm')} · ${untilLabel(nextRun)}`} />
        <Stat icon={<Activity size={12} />} label="Avg runtime" value={job.avgRuntime ?? '—'} />
      </div>

      {job.successRate != null && (
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="label">Success rate (30d)</span>
            <span className="text-xs tabular-nums text-text">{job.successRate}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden bg-bg/60">
            <div
              className="h-full"
              style={{
                width: `${job.successRate}%`,
                backgroundColor: job.successRate >= 95 ? '#46d369' : job.successRate >= 85 ? '#f0a020' : '#ff5566',
              }}
            />
          </div>
        </div>
      )}

      {job.outputs && job.outputs.length > 0 && (
        <div className="mb-4">
          <div className="label mb-1.5">Last run output</div>
          <ul className="space-y-1">
            {job.outputs.map((o, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-text/90">
                <CheckCircle2 size={12} className="shrink-0 text-neon-green" />
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {job.recentRuns && job.recentRuns.length > 0 && (
        <div>
          <div className="label mb-1.5">Recent runs</div>
          <div className="border border-line">
            {job.recentRuns.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-line/60 px-2 py-1.5 text-xs last:border-b-0"
              >
                <span className="flex items-center gap-2 text-dim">
                  <StatusDot color={RUN_COLOR[r.status]} size={6} />
                  {r.time}
                </span>
                <span className="tabular-nums text-text/80">{r.duration}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-line bg-bg/30 px-2 py-1.5">
      <div className="flex items-center gap-1.5 text-dim">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-0.5 truncate text-sm text-text">{value}</div>
    </div>
  )
}
