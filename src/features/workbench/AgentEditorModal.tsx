import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createAgent, fetchAgents, fetchProviders, updateAgent, type AgentOsProvider } from '@/features/agentos/client'
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

const OTHER_MODEL = '__other__'

// A curated starting point, not a live list of every model — ids move fast
// and availability depends on your own accounts, so "Custom" stays the
// escape hatch. A value can name its provider ("claude-cli:sonnet",
// "ollama:llama3.2:3b"), which lets agents on one gateway run on different
// providers; see agent-os's models/real.ts (provider router). A bare
// "claude-…" id uses the Anthropic API when the gateway has a key, else the
// Claude CLI. `providers` is what the group needs from the gateway — groups
// it can't use are labeled from GET /providers.
const MODEL_GROUPS: { label: string; providers: string[]; options: { value: string; label: string }[] }[] = [
  {
    label: 'Claude — your subscription (Claude Code CLI)',
    providers: ['claude-cli'],
    options: [
      { value: 'claude-cli:sonnet', label: 'Claude Sonnet (subscription)' },
      { value: 'claude-cli:opus', label: 'Claude Opus (subscription)' },
      { value: 'claude-cli:haiku', label: 'Claude Haiku (subscription)' },
    ],
  },
  {
    label: 'Anthropic',
    providers: ['anthropic', 'claude-cli'],
    options: [
      { value: 'claude-opus-5', label: 'Claude Opus 5' },
      { value: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    ],
  },
  {
    label: 'OpenAI / compatible',
    providers: ['openai'],
    options: [
      { value: 'openai:gpt-4o', label: 'GPT-4o' },
      { value: 'openai:gpt-4o-mini', label: 'GPT-4o mini' },
    ],
  },
  {
    label: 'Ollama (local)',
    providers: ['ollama'],
    options: [{ value: 'ollama:llama3.2:3b', label: 'Llama 3.2 3B' }],
  },
]

/**
 * Create or edit an Agent-OS agent identity — POST /agents to register a
 * brand-new one, PUT /agents/:id to update name/persona/role/capabilities/
 * defaultModel on an existing one. `target` present means edit (id
 * locked); absent means create (id is a free field, becomes permanent
 * once submitted — agent-os has no rename/delete route). Live status,
 * current task/worker and metrics stay server-derived and aren't
 * editable here.
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
  const [customModel, setCustomModel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [capabilitySuggestions, setCapabilitySuggestions] = useState<string[]>([])

  const isEdit = !!target

  // Best-effort discoverability, not a taxonomy fetch — pulls whatever
  // capability strings the rest of the roster already declared so typing
  // here isn't a total guessing game, without pretending there's a fixed
  // list to validate against.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetchAgents()
      .then((agents) => {
        if (cancelled) return
        const all = new Set<string>()
        for (const a of agents) for (const c of a.capabilities ?? []) all.add(c)
        setCapabilitySuggestions([...all].sort())
      })
      .catch(() => {
        /* no suggestions is fine — the field still works as plain free text */
      })
    return () => {
      cancelled = true
    }
  }, [open])

  // Which providers the gateway can actually use, to label the groups it
  // can't. Unknown (older gateway) leaves every group unlabeled.
  const [providers, setProviders] = useState<AgentOsProvider[] | null>(null)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetchProviders()
      .then((p) => !cancelled && setProviders(p))
      .catch(() => !cancelled && setProviders(null))
    return () => {
      cancelled = true
    }
  }, [open])
  const groupUsable = (names: string[]) => !providers || providers.some((p) => names.includes(p.name) && p.available)

  useEffect(() => {
    if (!open) return
    setError('')
    setId(target?.id ?? '')
    setName(target?.name ?? '')
    setRole(target?.role ?? '')
    setPersona(target?.persona ?? '')
    setCapabilities(target?.capabilities.join(', ') ?? '')
    const preset = target?.defaultModel ?? ''
    const isKnown = !preset || MODEL_GROUPS.some((g) => g.options.some((o) => o.value === preset))
    setDefaultModel(isKnown ? preset : OTHER_MODEL)
    setCustomModel(isKnown ? '' : preset)
  }, [open, target])

  const submit = async () => {
    if (!name.trim() || !persona.trim() || (!isEdit && !id.trim())) return
    setBusy(true)
    setError('')
    const caps = capabilities.split(',').map((c) => c.trim()).filter(Boolean)
    const resolvedModel = (defaultModel === OTHER_MODEL ? customModel : defaultModel).trim() || undefined
    try {
      if (isEdit) {
        await updateAgent(target!.id, {
          name: name.trim(),
          persona: persona.trim(),
          role: role.trim() || undefined,
          capabilities: caps,
          defaultModel: resolvedModel,
        })
        onSaved(target!.id)
      } else {
        const agent = await createAgent({
          id: id.trim(),
          name: name.trim(),
          persona: persona.trim(),
          role: role.trim() || undefined,
          capabilities: caps,
          defaultModel: resolvedModel,
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
            list="capability-suggestions"
            className="w-full border border-line bg-bg/40 px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
          />
          {/* Not a <select> on purpose — agent-os deliberately keeps
              capabilities free-text and unenforced (see its identity.ts:
              "a simple declared list, not enforced against anything"),
              so there's no fixed taxonomy to pick from. This datalist is
              just a discoverability aid, sourced from every OTHER agent's
              already-declared capabilities, typing past it still works. */}
          <datalist id="capability-suggestions">
            {capabilitySuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="mt-1 text-[10px] text-dim">
            Free text, comma-separated — agent-os doesn't enforce a fixed list of capabilities.
          </p>
        </div>
        <div>
          <label className="label mb-1 block">Default model</label>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full border border-line bg-bg/40 px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
          >
            <option value="">Use the gateway's default</option>
            {MODEL_GROUPS.map((g) => (
              <optgroup key={g.label} label={groupUsable(g.providers) ? g.label : `${g.label} — not set up on the gateway`}>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ))}
            <option value={OTHER_MODEL}>Custom…</option>
          </select>
          {defaultModel === OTHER_MODEL && (
            <input
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              autoFocus
              placeholder="model id, optionally with a provider: ollama:qwen2.5:7b, claude-cli:sonnet"
              className="mt-1.5 w-full border border-line bg-bg/40 px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
            />
          )}
          <p className="mt-1 text-[10px] text-dim">
            A provider the gateway can&apos;t use falls back to its default. For your Claude subscription, run{' '}
            <code>claude</code> once on the gateway machine and log in.
          </p>
        </div>
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
