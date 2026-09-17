import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, Loader2, Ban, ArrowRight, RotateCcw, Square, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useAgentOsFlow, useAgentOsFlowList } from '@/features/agentos/useAgentOsFlow'
import { useAgentOsTasks } from '@/features/agentos/useAgentOsTasks'
import type { AgentOsFlowStatus, AgentOsTask, AgentOsTaskStatus, FlowStepInput } from '@/features/agentos/sessionClient'
import { cn } from '@/lib/cn'

const STEP_ICON: Record<AgentOsTaskStatus, typeof CheckCircle2> = {
  queued: Clock,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: XCircle,
  timed_out: XCircle,
  cancelled: Ban,
  lost: XCircle,
}

const STEP_COLOR: Record<AgentOsTaskStatus, string> = {
  queued: '#6b7785',
  running: '#f0a020',
  succeeded: '#46d369',
  failed: '#ff5566',
  timed_out: '#ff5566',
  cancelled: '#6b7785',
  lost: '#ff5566',
}

const FLOW_COLOR: Record<AgentOsFlowStatus, string> = {
  running: '#f0a020',
  succeeded: '#46d369',
  failed: '#ff5566',
  cancelled: '#6b7785',
}

/** Same extraction used by TasksTab — `finalContent` for a chat-style
 * turn, else a pretty-printed dump of whatever's in the task's output. */
function taskOutputText(t: AgentOsTask | undefined): string | null {
  const out = t?.output
  if (out && typeof out.finalContent === 'string' && out.finalContent.trim()) return out.finalContent
  if (out && Object.keys(out).length) return JSON.stringify(out, null, 2)
  return null
}

/**
 * The workbench's Flow tab — live DAG view of the currently active Flow
 * (if any), with cancel/resume, plus a picker to switch to any other
 * Flow. `steps` is the FlowStepInput[] the active Flow was created with
 * (needed for resume() and to label each step with its agent/goal —
 * agent-os's flow-engine.ts only persists id/dependsOn/status
 * server-side, see sessionClient.ts's resumeFlow docs). Flows picked from
 * the list below the active one carry no such metadata, so resume is
 * disabled for those until you re-select them as the active flow from a
 * context that has it. `onNewFlow` opens the flow-creation modal — lives
 * here rather than the top strip since it's an action scoped to this
 * panel's own content, not a global control.
 */
export function FlowTab({
  flowId,
  steps,
  onSelectFlow,
  onNewFlow,
}: {
  flowId: string | null
  steps: FlowStepInput[]
  onSelectFlow: (id: string | null, steps: FlowStepInput[]) => void
  onNewFlow: () => void
}) {
  const { flow, error, cancel, resume } = useAgentOsFlow(flowId, steps)
  const { flows, loading } = useAgentOsFlowList()
  const { tasks } = useAgentOsTasks(flowId ? { flowId } : {})
  const [openStep, setOpenStep] = useState<string | null>(null)

  const stepMeta = (stepId: string) => steps.find((s) => s.id === stepId)
  const taskFor = (taskId: string | undefined) => (taskId ? tasks.find((t) => t.id === taskId) : undefined)

  return (
    <div className="flex h-full flex-col">
      {error && <p className="border-b border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}
      {flow ? (
        <div className="flex-1 overflow-y-auto p-3">
          {flow.status === 'cancelled' && flow.steps.some((s) => s.status === 'running') && (
            <p className="mb-3 border border-line bg-panel-2/60 px-2.5 py-1.5 text-[11px] text-dim">
              Cancelling a Flow stops any <em>not-yet-started</em> steps — it can't interrupt a step whose model call is already
              in flight. The step below marked "running" will finish (or fail/time out) on its own.
            </p>
          )}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-dim">Flow</span>
              <code className="text-text/80">{flow.id.slice(0, 8)}</code>
              <span className="uppercase tracking-wider" style={{ color: FLOW_COLOR[flow.status] }}>
                {flow.status}
              </span>
            </div>
            <div className="flex gap-2">
              {flow.status === 'running' && (
                <button
                  onClick={() => cancel()}
                  className="flex items-center gap-1.5 border border-danger/40 bg-danger/10 px-2.5 py-1 text-[11px] uppercase tracking-wider text-danger hover:bg-danger/20"
                >
                  <Square size={11} /> Cancel
                </button>
              )}
              {(flow.status === 'failed' || flow.status === 'cancelled') && (
                <button
                  onClick={() => resume()}
                  disabled={!steps.length}
                  className="flex items-center gap-1.5 border border-line px-2.5 py-1 text-[11px] uppercase tracking-wider text-text/80 hover:bg-panel-2 disabled:opacity-40"
                  title={steps.length ? undefined : 'Original step definitions unknown for this flow'}
                >
                  <RotateCcw size={11} /> Resume
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            {flow.steps.map((s) => {
              const meta = stepMeta(s.id)
              const Icon = STEP_ICON[s.status]
              const task = taskFor(s.taskId)
              const output = taskOutputText(task)
              const isOpen = openStep === s.id
              const Chevron = isOpen ? ChevronDown : ChevronRight
              return (
                <div key={s.id} className="border border-line bg-bg/40">
                  <button
                    onClick={() => setOpenStep((cur) => (cur === s.id ? null : s.id))}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-panel-2/30"
                  >
                    <Chevron size={11} className="shrink-0 text-dim" />
                    <Icon size={13} style={{ color: STEP_COLOR[s.status] }} className={s.status === 'running' ? 'animate-spin' : undefined} />
                    <span className="truncate text-text/80">{meta?.goal ?? s.id}</span>
                    <span className="shrink-0 text-dim">· {meta?.agentId ?? '?'}</span>
                    {s.dependsOn.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-dim">
                        <ArrowRight size={10} /> {s.dependsOn.join(', ')}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] uppercase tracking-wider" style={{ color: STEP_COLOR[s.status] }}>
                      {s.status}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-line/40 px-2.5 py-2">
                      {output ? (
                        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-text/80">{output}</pre>
                      ) : (
                        <p className="text-[11px] text-dim">
                          {s.status === 'running' || s.status === 'queued'
                            ? 'Still running — no output yet.'
                            : s.taskId
                              ? 'No output recorded for this step.'
                              : "No task linked to this step yet — it hasn't started."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="p-3 text-xs text-dim">No active flow selected. Pick one below, or start a new one.</p>
      )}
      <div className="max-h-[30%] overflow-y-auto border-t border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <span className="label">All flows</span>
          <button
            onClick={onNewFlow}
            className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 px-2 py-1 text-[10px] uppercase tracking-wider text-accent hover:bg-accent/20"
          >
            <Plus size={11} /> New Flow
          </button>
        </div>
        {loading && <p className="p-2 text-xs text-dim">Loading…</p>}
        {!loading && !flows.length && <p className="p-2 text-xs text-dim">No flows yet.</p>}
        {flows
          .slice()
          .reverse()
          .map((f) => (
            <button
              key={f.id}
              onClick={() => onSelectFlow(f.id, f.id === flowId ? steps : [])}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-panel-2/50',
                f.id === flowId && 'bg-panel-2',
              )}
            >
              <code className="text-text/70">{f.id.slice(0, 8)}</code>
              <span className="text-dim">{f.steps.length} steps</span>
              <span className="ml-auto uppercase tracking-wider text-[10px]" style={{ color: FLOW_COLOR[f.status] }}>
                {f.status}
              </span>
            </button>
          ))}
      </div>
    </div>
  )
}
