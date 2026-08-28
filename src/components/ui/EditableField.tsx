import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'

/** Shared editable text field used by both the Home HUD planet detail and
 *  the Projects Kanban popup — click the pencil to edit, Enter/check to
 *  commit, Escape/x to cancel. */
export function EditableField({
  label,
  value,
  color,
  onSave,
}: {
  label: string
  value: string
  color: string
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    onSave(draft)
    setEditing(false)
  }
  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  return (
    <div className="border border-line bg-bg/40 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="label" style={{ color }}>
          {label}
        </span>
        {editing ? (
          <div className="flex gap-1">
            <button onClick={commit} className="text-neon-green/80 hover:text-neon-green">
              <Check size={12} />
            </button>
            <button onClick={cancel} className="text-dim hover:text-danger">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setDraft(value)
              setEditing(true)
            }}
            className="text-dim hover:text-text"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') cancel()
          }}
          rows={2}
          className="w-full resize-none bg-transparent text-xs text-text/85 outline-none"
        />
      ) : (
        <div className="text-xs text-text/85">{value}</div>
      )}
    </div>
  )
}
