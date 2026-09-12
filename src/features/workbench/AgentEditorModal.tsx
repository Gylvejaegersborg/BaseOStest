import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createAgent, updateAgent } from '@/features/agentos/client'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { cn } from '@/lib/cn'

interface EditTarget {
  id: string
  name: string
  persona: string
  role: string
  capabilities: string[]
  defaultModel?: string
}

/**
 * Create or edit an Agent-OS agent identity — POST /agents to register a
 * brand-new one, PUT /agents/:id to update name/persona/role/capabilities
 * on an existing one. `target` present means edit (id locked); absent
 * means create (id is a free field, becomes permanent once submitted —
 * agent-os has no rename/delete route). Live status, current task/worker
 * and metrics stay server-derived and aren't editable here.
 */
export function AgentEditorModal({
  open,
  target,
  onClose,
  onSaved,
}: {
  open: boolean
  target: EditTarget | null
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const { refreshAgents } = useAgentOsContext()
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [persona, setPersona] = useState('')
  const [capabilities, setCapabilities] = useState('')
  const [defaultModel, setDefaultModel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!target

  useEffect(() => {
    if (!open) return
    setError('')
    setId(target?.id ?? '')
    setName(target?.name ?? '')
    setRole(target?.role ?? '')
    setPersona(target?.persona ?? '')
    setCapabilities(target?.capabilities.join(', ') ?? '')
    setDefaultModel(target?.defaultModel ?? '')
  }, [open, target])

  const submit = async () => {
    if (!name.trim() || !persona.trim() || (!isEdit && !id.trim())) return
    setBusy(true)
    setError('')
    const caps = capabilities.split(',').map((c) => c.trim()).filter(Boolean)
    try {
      if (isEdit) {
        await updateAgent(target!.id, { name: name.trim(), persona: persona.trim(), role: role.trim() || undefined, capabilities: caps })
        onSaved(target!.id)
      } else {
        const agent = await createAgent({
          id: id.trim(),
          name: name.trim(),
          persona: persona.trim(),
          role: role.trim() || undefined,
          capabilities: caps,
          defaultModel: defaultModel.trim() || undefined,
        })
        onSaved(agent.id)
      }
      refreshAgents()
      onClose()
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not save agent')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Agent' : 'New Agent'} code="WB.02" accent="#58b6f0" width={480}>
      <div className="space-y-3">
        <div>
          <label className="label mb-1 block">Id</label>
          <input
            value={id}
            onChange={(e) => setId(e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            disabled={isEdit}
            placeholder="e.g. orpheus"
            className="w-full border border-line bg-bg/40 px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50 disabled:opacity-50"
          />
          {!isEdit && <p className="mt-1 text-[10px] text-dim">Permanent once created — agent-os has no rename route yet.</p>}
        </div>
        <div>
          <label className="label mb-1 block">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={!isEdit}
            placeholder="e.g. Orpheus"
            className="w-full border border-line bg-bg/40 px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
          />
        </div>
        <div>
          <label className="label mb-1 block">Role</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Mixing · Mastering"
            className="w-full border border-line bg-bg/40 px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
          />
        </div>
        <div>
          <label className="label mb-1 block">Persona</label>
          <textarea
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            rows={3}
            placeholder="What this agent is for, how it should act — its system prompt."
            className="w-full resize-none border border-line bg-bg/40 p-2 text-sm text-text outline-none focus:border-accent/50"
          />
        </div>
        <div>
          <label className="label mb-1 block">Capabilities</label>
          <input
            value={capabilities}
            onChange={(e) => setCapabilities(e.target.value)}
            placeholder="comma-separated, e.g. audio-mix, mastering"
            className="w-full border border-line bg-bg/40 px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
          />
        </div>
        {!isEdit && (
          <div>
            <label className="label mb-1 block">Default model (optional)</label>
            <input
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              placeholder="leave blank to use the gateway's default"
              className="w-full border border-line bg-bg/40 px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
            />
          </div>
        )}
        {error && <p className="border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || !name.trim() || !persona.trim() || (!isEdit && !id.trim())}
          className={cn(
            'w-full border px-3 py-2 text-xs uppercase tracking-wider disabled:opacity-40',
            'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
          )}
        >
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create agent'}
        </button>
      </div>
    </Modal>
  )
}
