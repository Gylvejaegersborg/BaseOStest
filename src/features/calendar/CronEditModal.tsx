import { useState } from 'react'
import type { CronJob, CronSchedule } from '@/data/calendar'
import { Modal } from '@/components/ui/Modal'
import { hhmm, parseHM } from './util'
import { CRON_STATUS_COLOR } from './cron'

const OWNERS: CronJob['owner'][] = ['Claude', 'Hemera', 'Nyx']
const STATUSES: CronJob['status'][] = ['ok', 'running', 'warn']
const STATUS_LABEL: Record<CronJob['status'], string> = {
  ok: 'Healthy',
  running: 'Running',
  warn: 'Warn',
}

export function CronEditModal({
  job,
  onClose,
  onSave,
}: {
  job: CronJob | null
  onClose: () => void
  onSave: (c: CronJob) => void
}) {
  const [draft, setDraft] = useState<CronJob | null>(job)
  if (job && (!draft || draft.id !== job.id)) setDraft(job)
  if (!job || !draft) return null

  const color = CRON_STATUS_COLOR[draft.status]
  const set = (patch: Partial<CronJob>) => setDraft({ ...draft, ...patch })
  const setSchedule = (s: CronSchedule) => setDraft({ ...draft, schedule: s })

  return (
    <Modal open={!!job} onClose={onClose} title="Edit cron job" code={`CRON.${draft.id.toUpperCase()}`} accent={color} width={480}>
      <label className="label mb-1 block">Name</label>
      <input
        value={draft.name}
        autoFocus
        onChange={(e) => set({ name: e.target.value })}
        className="mb-3 w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      />

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="label mb-1 block">Owner</label>
          <select
            value={draft.owner}
            onChange={(e) => set({ owner: e.target.value as CronJob['owner'] })}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          >
            {OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label mb-1 block">Status</label>
          <select
            value={draft.status}
            onChange={(e) => set({ status: e.target.value as CronJob['status'] })}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule editor */}
      <label className="label mb-1 block">Schedule</label>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <select
          value={draft.schedule.type}
          onChange={(e) => {
            const type = e.target.value as CronSchedule['type']
            if (type === 'daily') setSchedule({ type: 'daily', hour: 8 })
            else if (type === 'everyHours') setSchedule({ type: 'everyHours', n: 2 })
            else setSchedule({ type: 'everyMinutes', n: 15 })
          }}
          className="border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
        >
          <option value="daily">Daily at</option>
          <option value="everyHours">Every N hours</option>
          <option value="everyMinutes">Every N minutes</option>
        </select>

        {draft.schedule.type === 'daily' ? (
          <input
            type="time"
            value={hhmm(draft.schedule.hour)}
            onChange={(e) => {
              const h = parseHM(e.target.value)
              if (h != null) setSchedule({ type: 'daily', hour: h })
            }}
            className="border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none [color-scheme:dark]"
          />
        ) : (
          <input
            type="number"
            min={1}
            value={draft.schedule.n}
            onChange={(e) => {
              const n = Math.max(1, Number(e.target.value) || 1)
              setSchedule(
                draft.schedule.type === 'everyHours' ? { type: 'everyHours', n } : { type: 'everyMinutes', n },
              )
            }}
            className="border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          />
        )}
      </div>

      <label className="label mb-1 block">Description</label>
      <textarea
        value={draft.description ?? ''}
        onChange={(e) => set({ description: e.target.value })}
        rows={3}
        className="mb-4 w-full resize-none border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      />

      <div className="flex justify-end gap-2 text-xs text-dim">
        <button onClick={onClose} className="border border-line px-3 py-1.5 uppercase tracking-wider hover:text-text">
          Cancel
        </button>
        <button
          onClick={() => draft.name.trim() && onSave(draft)}
          disabled={!draft.name.trim()}
          className="border px-3 py-1.5 uppercase tracking-wider disabled:opacity-40"
          style={{ borderColor: `${color}66`, color }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}
