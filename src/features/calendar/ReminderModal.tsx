import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { REMINDER_COLOR, type Reminder } from '@/data/calendar'
import { Modal } from '@/components/ui/Modal'
import { hhmm, parseHM } from './util'

const DAY_OPTIONS = [
  { v: -1, label: 'Yesterday' },
  { v: 0, label: 'Today' },
  { v: 1, label: 'Tomorrow' },
  { v: 2, label: 'In 2 days' },
  { v: 3, label: 'In 3 days' },
  { v: 7, label: 'In a week' },
]

export function ReminderModal({
  reminder,
  onClose,
  onSave,
  onDelete,
}: {
  reminder: Reminder | null
  onClose: () => void
  onSave: (r: Reminder) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState<Reminder | null>(reminder)
  if (reminder && (!draft || draft.id !== reminder.id)) setDraft(reminder)
  if (!reminder || !draft) return null

  const set = (patch: Partial<Reminder>) => setDraft({ ...draft, ...patch })
  // Offer the draft's day even if it isn't one of the presets (e.g. set via grid click).
  const dayOptions = DAY_OPTIONS.some((o) => o.v === draft.dayOffset)
    ? DAY_OPTIONS
    : [...DAY_OPTIONS, { v: draft.dayOffset, label: `Day ${draft.dayOffset > 0 ? '+' : ''}${draft.dayOffset}` }]

  return (
    <Modal
      open={!!reminder}
      onClose={onClose}
      title="Reminder"
      code={draft.id.startsWith('new') ? 'NEW' : draft.id.toUpperCase()}
      accent={REMINDER_COLOR}
      width={420}
    >
      <label className="label mb-1 block">Title</label>
      <input
        value={draft.title}
        autoFocus
        onChange={(e) => set({ title: e.target.value })}
        placeholder="Remind me to…"
        className="mb-3 w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div>
          <label className="label mb-1 block">Day</label>
          <select
            value={draft.dayOffset}
            onChange={(e) => set({ dayOffset: Number(e.target.value) })}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          >
            {dayOptions.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label mb-1 block">Time</label>
          <input
            type="time"
            value={hhmm(draft.time)}
            onChange={(e) => {
              const h = parseHM(e.target.value)
              if (h != null) set({ time: h })
            }}
            className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-dim">
        <button
          onClick={() => onDelete(draft.id)}
          className="flex items-center gap-1 border border-line px-2 py-1.5 uppercase tracking-wider hover:text-danger"
        >
          <Trash2 size={12} /> Delete
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="border border-line px-3 py-1.5 uppercase tracking-wider hover:text-text">
            Cancel
          </button>
          <button
            onClick={() => draft.title.trim() && onSave(draft)}
            disabled={!draft.title.trim()}
            className="border px-3 py-1.5 uppercase tracking-wider disabled:opacity-40"
            style={{ borderColor: `${REMINDER_COLOR}66`, color: REMINDER_COLOR }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
