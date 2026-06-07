import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { REMINDER_COLOR, type Reminder } from '@/data/calendar'
import { Modal } from '@/components/ui/Modal'
import { hhmm, parseHM } from './util'
import { DateField } from './DateField'

function firstLine(s: string): string {
  return s.trim().split('\n')[0].slice(0, 80)
}

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
  const isNew = draft.id.startsWith('new')
  // Title can be empty if notes will fill it in on save.
  const canSave = !!(draft.title.trim() || draft.notes?.trim())

  const save = () => {
    if (!canSave) return
    const title = draft.title.trim() || firstLine(draft.notes ?? '')
    onSave({ ...draft, title })
  }

  return (
    <Modal
      open={!!reminder}
      onClose={onClose}
      title="Reminder"
      code={isNew ? 'NEW' : draft.id.toUpperCase()}
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

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="label mb-1 block">Date</label>
          <DateField value={draft.dayOffset} onChange={(d) => set({ dayOffset: d ?? 0 })} className="w-full" />
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

      <label className="label mb-1 block">Notes</label>
      <textarea
        value={draft.notes ?? ''}
        onChange={(e) => set({ notes: e.target.value })}
        rows={3}
        placeholder="Details… (used as the title if you leave it blank)"
        className="mb-4 w-full resize-none border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
      />

      <div className="flex items-center justify-between text-xs text-dim">
        {!isNew ? (
          <button
            onClick={() => onDelete(draft.id)}
            className="flex items-center gap-1 border border-line px-2 py-1.5 uppercase tracking-wider hover:text-danger"
          >
            <Trash2 size={12} /> Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="border border-line px-3 py-1.5 uppercase tracking-wider hover:text-text">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSave}
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
