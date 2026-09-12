import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { AGENTS } from '@/data/agents'
import { FLOW_TEMPLATES, resolveFlowTemplate, type FlowTemplate } from '@/data/flowTemplates'
import { createFlow, type FlowStepInput } from '@/features/agentos/sessionClient'
import { cn } from '@/lib/cn'

/**
 * Starts a new Flow from a predefined template — no planner involved.
 * Pick a template, type one goal, optionally reassign which agent runs
 * each step, submit. Resolves to FlowStepInput[] client-side and POSTs
 * straight to /flows (flow-engine.ts drives it in the background).
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
  const [goal, setGoal] = useState('')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setTemplate(null)
    setGoal('')
    setOverrides({})
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const submit = async () => {
    if (!template || !goal.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const steps = resolveFlowTemplate(template, goal.trim(), overrides)
      const flow = await createFlow(steps)
      onCreated(flow.id, steps)
      reset()
      onClose()
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not create flow')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Flow" code="WB.01" accent="#36e0c8" width={480}>
      {!template ? (
        <div className="space-y-2">
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
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text/90">{template.name}</span>
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
            {template.steps.map((s) => (
              <div key={s.id} className="flex items-center gap-2 border border-line bg-bg/40 px-2.5 py-1.5 text-xs">
                <span className="w-24 shrink-0 truncate text-text/80">{s.label}</span>
                <select
                  value={overrides[s.id] ?? s.defaultAgentId}
                  onChange={(e) => setOverrides((o) => ({ ...o, [s.id]: e.target.value }))}
                  className="flex-1 border border-line bg-bg/60 px-1.5 py-1 text-xs text-text outline-none"
                >
                  {AGENTS.filter((a) => !a.id.includes('-w')).map((a) => (
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
          <button
            onClick={submit}
            disabled={!goal.trim() || submitting}
            className={cn(
              'w-full border px-3 py-2 text-xs uppercase tracking-wider disabled:opacity-40',
              'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
            )}
          >
            {submitting ? 'Starting…' : 'Start flow'}
          </button>
        </div>
      )}
    </Modal>
  )
}
