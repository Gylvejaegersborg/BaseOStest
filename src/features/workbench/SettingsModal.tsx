import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { fetchSkills, fetchSkill, saveSkill, deleteSkill, type SkillMetadata } from '@/features/agentos/client'
import { cn } from '@/lib/cn'

/** Empty-string sentinel for "no skill selected yet" vs "editing a new,
 * unsaved one" — keeps the three modes (list / editing existing /
 * creating new) distinguishable without a separate boolean. */
const NEW_SKILL = '__new__'

/**
 * The Workbench's settings surface — currently just Skills (agent-os's
 * agentskills.io-format instructions, shared by every agent), framed as
 * "Settings" rather than a one-off "Skills modal" so future settings
 * (sandbox policy visibility, default model, ...) have an obvious home
 * instead of each getting their own bespoke entry point. Every agent
 * reads the SAME catalog — there's no per-agent skill assignment here,
 * matching agent-os's own skills.ts (a skill carries no execution
 * capability by itself, just context the model can choose to load).
 */
export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [skills, setSkills] = useState<SkillMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingName, setEditingName] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyName, setBusyName] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      setSkills(await fetchSkills())
      setError('')
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not load skills')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) refresh()
  }, [open])

  const startNew = () => {
    setEditingName(NEW_SKILL)
    setName('')
    setDescription('')
    setBody('')
    setError('')
  }

  const startEdit = async (skillName: string) => {
    setEditingName(skillName)
    setError('')
    try {
      const full = await fetchSkill(skillName)
      setName(full.name)
      setDescription(full.description)
      setBody(full.body)
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not load skill')
    }
  }

  const cancelEdit = () => {
    setEditingName(null)
    setError('')
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await saveSkill({ name: name.trim(), description: description.trim(), body })
      setEditingName(null)
      await refresh()
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not save skill')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (skillName: string) => {
    setBusyName(skillName)
    try {
      await deleteSkill(skillName)
      await refresh()
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not delete skill')
    } finally {
      setBusyName(null)
    }
  }

  const isEditing = editingName !== null
  const canSave = name.trim().length > 0 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name.trim()) && description.trim().length > 0

  return (
    <Modal open={open} onClose={onClose} title="Settings" code="WB.02" accent="#f0a020" width={620}>
      {!isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="label">Skills</span>
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] uppercase tracking-wider text-accent hover:bg-accent/20"
            >
              <Plus size={12} /> New skill
            </button>
          </div>
          <p className="text-[11px] text-dim">
            agentskills.io-format instructions, shared by every agent — each one's name+description is always in context; the full body only
            loads when an agent actually calls the <code>skill</code> tool for it.
          </p>
          {error && <p className="border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}
          {loading && <p className="text-xs text-dim">Loading…</p>}
          {!loading && !skills.length && <p className="border border-line bg-bg/20 p-2 text-[11px] text-dim">No skills yet.</p>}
          <div className="space-y-1.5">
            {skills.map((s) => (
              <div key={s.name} className="flex items-start gap-2 border border-line bg-bg/40 p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text/90">{s.name}</div>
                  <div className="mt-0.5 text-[11px] text-dim">{s.description}</div>
                </div>
                <button onClick={() => startEdit(s.name)} title="Edit" className="shrink-0 text-dim hover:text-accent">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(s.name)}
                  disabled={busyName === s.name}
                  title="Delete"
                  className="shrink-0 text-dim hover:text-danger disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text/90">{editingName === NEW_SKILL ? 'New skill' : `Editing "${editingName}"`}</span>
            <button onClick={cancelEdit} className="text-[11px] text-dim underline hover:text-text">
              back to list
            </button>
          </div>
          <div>
            <label className="label mb-1 block">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={editingName !== NEW_SKILL}
              placeholder="e.g. release-checklist"
              className="w-full border border-line bg-bg/40 px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50 disabled:opacity-60"
            />
            <p className="mt-1 text-[10px] text-dim">Lowercase letters, numbers and hyphens only. Can't be changed after creation.</p>
          </div>
          <div>
            <label className="label mb-1 block">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One line — shown to every agent at all times, so keep it short."
              className="w-full border border-line bg-bg/40 px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="label mb-1 block">Instructions</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="The full skill body — only loaded when an agent calls the skill tool for this one."
              className="w-full resize-none border border-line bg-bg/40 p-2 font-mono text-xs text-text outline-none focus:border-accent/50"
            />
          </div>
          {error && <p className="border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}
          <button
            onClick={save}
            disabled={!canSave || saving}
            className={cn(
              'w-full border px-3 py-2 text-xs uppercase tracking-wider disabled:opacity-40',
              'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
            )}
          >
            {saving ? 'Saving…' : 'Save skill'}
          </button>
        </div>
      )}
    </Modal>
  )
}
