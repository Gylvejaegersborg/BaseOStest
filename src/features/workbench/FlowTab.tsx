import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, Loader2, Ban, ArrowRight, RotateCcw, Square, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useAgentOsFlow, useAgentOsFlowList } from '@/features/agentos/useAgentOsFlow'
import type { AgentOsFlowReportAttempt, AgentOsFlowStatus, AgentOsTaskStatus, FlowStepInput } from '@/features/agentos/sessionClient'
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

const fmtSeconds = (n: number) => (n >= 60 ? `${Math.floor(n / 60)}m ${n % 60}s` : `${n}s`)
const fmtTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n))

/** One attempt at a step: what it said (or why it stopped), what it added to BaseSpace, the calls it made, the cost. */
function Attempt({ a, label }: { a: AgentOsFlowReportAttempt; label?: string }) {
  const [calls, setCalls] = useState(false)
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-dim">
        {label && <span className="uppercase tracking-wider">{label}</span>}
        <span style={{ color: STEP_COLOR[a.status as AgentOsTaskStatus] ?? undefined }}>{a.status}</span>
        {a.seconds !== undefined && <span>{fmtSeconds(a.seconds)}</span>}
        {a.tokens && (
          <span>
            {fmtTokens(a.tokens.input)} in / {fmtTokens(a.tokens.output)} out tokens
          </span>
        )}
        <span>
          {a.toolCalls.length} tool call{a.toolCalls.length === 1 ? '' : 's'}
        </span>
      </div>
      {a.error && <p className="text-[11px] text-danger">{a.error}</p>}
      {a.result && <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-text/80">{a.result}</pre>}
      {!a.error && !a.result && <p className="text-[11px] text-dim">{a.status === 'running' ? 'Still running, nothing reported yet.' : 'No output recorded.'}</p>}
      {a.added.length > 0 && (
        <div className="border-l-2 border-accent/50 pl-2">
          <p className="text-[10px] uppercase tracking-wider text-dim">Added to BaseSpace ({a.added.length})</p>
          <ul className="text-[11px] text-text/80">
            {a.added.map((x, i) => (
              <li key={i} className="truncate">
                <span className="text-dim">{x.kind}</span> {x.title}
                {x.folder ? <span className="text-dim"> · {x.folder}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      {a.toolCalls.length > 0 && (
        <div>
          <button onClick={() => setCalls((v) => !v)} className="text-[10px] uppercase tracking-wider text-dim hover:text-text">
            {calls ? 'Hide' : 'Show'} tool calls
          </button>
          {calls && (
            <ul className="mt-1 space-y-0.5 text-[10px] text-text/70">
              {a.toolCalls.map((t, i) => (
                <li key={i} className="truncate">
                  <span style={{ color: t.ok ? undefined : '#ff5566' }}>{t.ok ? '✓' : '✗'}</span> <code>{t.name}</code> {t.summary}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
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
  const { flow, report, error, busy, cancel, resume, steps: knownSteps } = useAgentOsFlow(flowId, steps)
  const { flows, loading } = useAgentOsFlowList()
  const [openStep, setOpenStep] = useState<string | null>(null)

  const stepMeta = (stepId: string) => knownSteps.find((s) => s.id === stepId)
  const reportFor = (stepId: string) => report?.steps.find((r) => r.id === stepId)

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
              {flow.title ? <strong className="text-sm font-normal text-text">{flow.title}</strong> : null}
              <code className="text-text/60">{flow.id.slice(0, 8)}</code>
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
                  disabled={!knownSteps.length || busy}
                  className="flex items-center gap-1.5 border border-line px-2.5 py-1 text-[11px] uppercase tracking-wider text-text/80 hover:bg-panel-2 disabled:opacity-40"
                  title={knownSteps.length ? undefined : 'Original step definitions unknown for this flow'}
                >
                  <RotateCcw size={11} className={busy ? 'animate-spin' : undefined} /> {busy ? 'Resuming…' : 'Resume'}
                </button>
              )}
            </div>
          </div>
          {report && (
            <div className="mb-3 space-y-1 border border-line bg-panel-2/40 px-2.5 py-2 text-[11px] text-text/80">
              {report.summary && <p>{report.summary}</p>}
              <p className="text-dim">
                {report.proposedBy ? `Designed by ${report.proposedBy} · ` : ''}
                {report.steps.filter((r) => r.status === 'succeeded').length}/{report.steps.length} steps done · {report.totals.toolCalls} tool calls ·{' '}
                {report.totals.added} added to BaseSpace
                {report.totals.tokens.input + report.totals.tokens.output > 0
                  ? ` · ${fmtTokens(report.totals.tokens.input)} in / ${fmtTokens(report.totals.tokens.output)} out tokens`
                  : ''}
                {report.totals.seconds ? ` · ${fmtSeconds(report.totals.seconds)} of agent time` : ''}
              </p>
              {report.steps.some((r) => r.status === 'failed') && (
                <p className="text-danger">
                  {report.steps
                    .filter((r) => r.status === 'failed')
                    .map((r) => r.id)
                    .join(', ')}{' '}
                  failed. Resume runs only the steps that did not finish; the finished ones keep their results.
                </p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            {flow.steps.map((s) => {
              const meta = stepMeta(s.id)
              const Icon = STEP_ICON[s.status]
              const rep = reportFor(s.id)
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
                    <strong className="shrink-0 font-normal text-text">{s.id}</strong>
                    <span className="shrink-0 text-dim">· {rep?.agentId ?? meta?.agentId ?? '?'}</span>
                    {rep && rep.attempts.length > 1 && <span className="shrink-0 text-[10px] text-dim">{rep.attempts.length} attempts</span>}
                    {rep && rep.attempts.some((a) => a.added.length) ? (
                      <span className="shrink-0 text-[10px] text-accent">+{rep.attempts.reduce((n, a) => n + a.added.length, 0)} added</span>
                    ) : null}
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
                    <div className="space-y-2 border-t border-line/40 px-2.5 py-2">
                      {(rep?.goal ?? meta?.goal) && <p className="text-[11px] italic text-dim">{rep?.goal ?? meta?.goal}</p>}
                      {rep && rep.attempts.length ? (
                        rep.attempts
                          .slice()
                          .reverse()
                          .map((a, i, all) => <Attempt key={a.taskId} a={a} label={all.length > 1 ? `Attempt ${all.length - i}` : undefined} />)
                      ) : (
                        <p className="text-[11px] text-dim">
                          {s.status === 'running' || s.status === 'queued' ? 'Not finished yet.' : 'No task is linked to this step, so it has not started.'}
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
              onClick={() => onSelectFlow(f.id, f.id === flowId ? knownSteps : [])}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-panel-2/50',
                f.id === flowId && 'bg-panel-2',
              )}
            >
              {f.title ? <span className="truncate text-text/90">{f.title}</span> : <code className="text-text/70">{f.id.slice(0, 8)}</code>}
              <span className="shrink-0 text-dim">{f.steps.length} steps</span>
              <span className="ml-auto uppercase tracking-wider text-[10px]" style={{ color: FLOW_COLOR[f.status] }}>
                {f.status}
              </span>
            </button>
          ))}
      </div>
    </div>
  )
}
