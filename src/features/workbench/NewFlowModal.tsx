import { useEffect, useState } from 'react'
import { Plus, Trash2, FileText, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { AGENTS } from '@/data/agents'
import { FLOW_TEMPLATES, resolveFlowTemplate, type FlowTemplate } from '@/data/flowTemplates'
import { createFlow, type FlowStepInput } from '@/features/agentos/sessionClient'
import { deleteFlowDraft, listFlowDrafts, saveFlowDraft, type FlowDraft } from '@/data/flowDrafts'
import { cn } from '@/lib/cn'

const REAL_AGENTS = AGENTS.filter((a) => !a.id.includes('-w'))

interface DraftStep {
  key: string
  id: string
  agentId: string
  goal: string
  dependsOn: string[]
}

function newDraftStep(n: number): DraftStep {
  return { key: crypto.randomUUID(), id: `step-${n}`, agentId: REAL_AGENTS[0]?.id ?? '', goal: '', dependsOn: [] }
}

/**
 * Starts a new Flow either from a predefined template (no planner
 * involved — pick a pattern, type one goal, optionally reassign which
 * agent runs each step) or built from scratch step by step (any number
 * of steps, any agent per step, arbitrary dependencies). Both paths
 * resolve to the same FlowStepInput[] and POST straight to /flows
 * (flow-engine.ts drives it in the background).
 */
export function NewFlowModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (flowId: string, steps: FlowStepInput[]) => void
}) {
  const [template, setTemplate] = useState<FlowTemplate | null>(null)
  const [custom, setCustom] = useState(false)
  const [goal, setGoal] = useState('')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [customSteps, setCustomSteps] = useState<DraftStep[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState<FlowDraft[]>([])
  const [draftId, setDraftId] = useState<string | null>(null)

  useEffect(() => {
    if (open) setDrafts(listFlowDrafts())
  }, [open])

  const reset = () => {
    setTemplate(null)
    setCustom(false)
    setGoal('')
    setOverrides({})
    setCustomSteps([])
    setError('')
    setDraftId(null)
  }

  const resumeDraft = (d: FlowDraft) => {
    setDraftId(d.id)
    setError('')
    if (d.kind === 'custom') {
      setCustom(true)
      setCustomSteps(
        (d.customSteps ?? []).map((s) => ({ key: crypto.randomUUID(), id: s.id, agentId: s.agentId, goal: s.goal, dependsOn: s.dependsOn })),
      )
    } else {
      const t = FLOW_TEMPLATES.find((t) => t.id === d.templateId) ?? null
      setTemplate(t)
      setGoal(d.goal ?? '')
      setOverrides(d.overrides ?? {})
    }
  }

  const removeDraft = (id: string) => {
    deleteFlowDraft(id)
    setDrafts((ds) => ds.filter((d) => d.id !== id))
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const startCustom = () => {
    setCustom(true)
    setCustomSteps([newDraftStep(1)])
  }

  const addStep = () => setCustomSteps((steps) => [...steps, newDraftStep(steps.length + 1)])
  const removeStep = (key: string) => {
    setCustomSteps((steps) => {
      const removed = steps.find((s) => s.key === key)
      const rest = steps.filter((s) => s.key !== key)
      // Drop the removed step from any other step's dependsOn too — a
      // dangling dependency on an id that no longer exists would just
      // silently never resolve on the gateway.
      return removed ? rest.map((s) => ({ ...s, dependsOn: s.dependsOn.filter((d) => d !== removed.id) })) : rest
    })
  }
  const updateStep = (key: string, patch: Partial<DraftStep>) =>
    setCustomSteps((steps) => steps.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const toggleDependsOn = (key: string, depId: string) =>
    setCustomSteps((steps) =>
      steps.map((s) =>
        s.key === key ? { ...s, dependsOn: s.dependsOn.includes(depId) ? s.dependsOn.filter((d) => d !== depId) : [...s.dependsOn, depId] } : s,
      ),
    )

  const customIds = customSteps.map((s) => s.id.trim()).filter(Boolean)
  const customValid =
    customSteps.length > 0 &&
    customSteps.every((s) => s.id.trim() && s.goal.trim() && s.agentId) &&
    new Set(customIds).size === customSteps.length

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      let steps: FlowStepInput[]
      if (custom) {
        if (!customValid) return
        steps = customSteps.map((s) => ({ id: s.id.trim(), agentId: s.agentId, goal: s.goal.trim(), dependsOn: s.dependsOn }))
      } else {
        if (!template || !goal.trim()) return
        steps = resolveFlowTemplate(template, goal.trim(), overrides)
      }
      const flow = await createFlow(steps)
      if (draftId) deleteFlowDraft(draftId)
      onCreated(flow.id, steps)
      reset()
      onClose()
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not create flow')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = custom ? customValid : !!template && !!goal.trim()
  const canSaveDraft = custom ? customSteps.length > 0 : !!template

  const saveDraft = () => {
    const id = draftId ?? crypto.randomUUID()
    const draft: FlowDraft = custom
      ? {
          id,
          name: customSteps[0]?.goal?.trim().slice(0, 60) || customSteps[0]?.id || 'Untitled custom flow',
          createdAt: new Date().toISOString(),
          kind: 'custom',
          customSteps: customSteps.map((s) => ({ id: s.id.trim(), agentId: s.agentId, goal: s.goal, dependsOn: s.dependsOn })),
        }
      : {
          id,
          name: goal.trim().slice(0, 60) || template!.name,
          createdAt: new Date().toISOString(),
          kind: 'template',
          templateId: template!.id,
          goal,
          overrides,
        }
    saveFlowDraft(draft)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Flow" code="WB.01" accent="#c77591" width={560}>
      {!template && !custom ? (
        <div className="space-y-2">
          {drafts.length > 0 && (
            <div className="mb-3 space-y-1.5 border border-line bg-bg/20 p-2">
              <span className="label block">Drafts</span>
              {drafts.map((d) => (
                <div key={d.id} className="flex items-center gap-2 border border-line bg-bg/40 px-2 py-1.5 text-xs">
                  <FileText size={12} className="shrink-0 text-dim" />
                  <button onClick={() => resumeDraft(d)} className="flex-1 truncate text-left text-text/80 hover:text-accent">
                    {d.name}
                  </button>
                  <button onClick={() => removeDraft(d.id)} title="Delete draft" className="shrink-0 text-dim hover:text-danger">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mb-2 text-xs text-dim">Pick a pattern — each step runs with its own agent, in order or in parallel.</p>
          {FLOW_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t)}
              className="block w-full border border-line bg-bg/40 p-3 text-left hover:border-accent/50 hover:bg-panel-2/50"
            >
              <div className="text-sm text-text/90">{t.name}</div>
              <div className="mt-0.5 text-[11px] text-dim">{t.description}</div>
            </button>
          ))}
          <button
            onClick={startCustom}
            className="block w-full border border-dashed border-line bg-bg/20 p-3 text-left hover:border-accent/50 hover:bg-panel-2/50"
          >
            <div className="text-sm text-text/90">Custom</div>
            <div className="mt-0.5 text-[11px] text-dim">Build a flow step by step — any agents, any dependencies.</div>
          </button>
        </div>
      ) : custom ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text/90">Custom flow</span>
            <button onClick={() => { setCustom(false); setCustomSteps([]) }} className="text-[11px] text-dim underline hover:text-text">
              change pattern
            </button>
          </div>
          <div className="space-y-2">
            {customSteps.map((s) => {
              const others = customSteps.filter((o) => o.key !== s.key && o.id.trim())
              return (
                <div key={s.key} className="space-y-1.5 border border-line bg-bg/40 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={s.id}
                      onChange={(e) => updateStep(s.key, { id: e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      placeholder="step id"
                      className="w-28 shrink-0 border border-line bg-bg/60 px-1.5 py-1 text-xs text-text outline-none focus:border-accent/50"
                    />
                    <select
                      value={s.agentId}
                      onChange={(e) => updateStep(s.key, { agentId: e.target.value })}
                      className="flex-1 border border-line bg-bg/60 px-1.5 py-1 text-xs text-text outline-none"
                    >
                      {REAL_AGENTS.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <button onClick={() => removeStep(s.key)} title="Remove step" className="shrink-0 text-dim hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea
                    value={s.goal}
                    onChange={(e) => updateStep(s.key, { goal: e.target.value })}
                    rows={2}
                    placeholder="What should this step do?"
                    className="w-full resize-none border border-line bg-bg/60 p-1.5 text-xs text-text outline-none focus:border-accent/50"
                  />
                  {others.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-dim">
                      <span>depends on:</span>
                      {others.map((o) => (
                        <label key={o.key} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={s.dependsOn.includes(o.id.trim())}
                            onChange={() => toggleDependsOn(s.key, o.id.trim())}
                          />
                          {o.id.trim() || '(unnamed step)'}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <button
            onClick={addStep}
            className="flex w-full items-center justify-center gap-1.5 border border-line px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-dim hover:border-accent/60 hover:text-accent"
          >
            <Plus size={12} /> Add step
          </button>
          {customSteps.length > 0 && !customValid && (
            <p className="text-[10px] text-dim">Every step needs a unique id, an agent and a goal before this can start.</p>
          )}
          {error && <p className="border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={saveDraft}
              disabled={!canSaveDraft}
              className="flex-1 border border-line px-3 py-2 text-xs uppercase tracking-wider text-text/80 hover:bg-panel-2 disabled:opacity-40"
            >
              Save as draft
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className={cn(
                'flex-1 border px-3 py-2 text-xs uppercase tracking-wider disabled:opacity-40',
                'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
              )}
            >
              {submitting ? 'Starting…' : 'Start flow'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text/90">{template!.name}</span>
            <button onClick={() => setTemplate(null)} className="text-[11px] text-dim underline hover:text-text">
              change template
            </button>
          </div>
          <div>
            <label className="label mb-1 block">Goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              autoFocus
              placeholder="What should this flow accomplish?"
              className="w-full resize-none border border-line bg-bg/40 p-2 text-sm text-text outline-none focus:border-accent/50"
            />
          </div>
          <div className="space-y-1.5">
            <span className="label block">Steps</span>
            {template!.steps.map((s) => (
              <div key={s.id} className="flex items-center gap-2 border border-line bg-bg/40 px-2.5 py-1.5 text-xs">
                <span className="w-24 shrink-0 truncate text-text/80">{s.label}</span>
                <select
                  value={overrides[s.id] ?? s.defaultAgentId}
                  onChange={(e) => setOverrides((o) => ({ ...o, [s.id]: e.target.value }))}
                  className="flex-1 border border-line bg-bg/60 px-1.5 py-1 text-xs text-text outline-none"
                >
                  {REAL_AGENTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {s.dependsOn && s.dependsOn.length > 0 && <span className="shrink-0 text-[10px] text-dim">after {s.dependsOn.join(', ')}</span>}
              </div>
            ))}
          </div>
          {error && <p className="border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={saveDraft}
              disabled={!canSaveDraft}
              className="flex-1 border border-line px-3 py-2 text-xs uppercase tracking-wider text-text/80 hover:bg-panel-2 disabled:opacity-40"
            >
              Save as draft
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className={cn(
                'flex-1 border px-3 py-2 text-xs uppercase tracking-wider disabled:opacity-40',
                'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
              )}
            >
              {submitting ? 'Starting…' : 'Start flow'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
