import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, Loader2, Ban, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useAgentOsTasks } from '@/features/agentos/useAgentOsTasks'
import type { AgentOsTask, AgentOsTaskStatus } from '@/features/agentos/sessionClient'

const STATUS_ICON: Record<AgentOsTaskStatus, typeof CheckCircle2> = {
  queued: Clock,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: XCircle,
  timed_out: XCircle,
  cancelled: Ban,
  lost: HelpCircle,
}

const STATUS_COLOR: Record<AgentOsTaskStatus, string> = {
  queued: '#6b7785',
  running: '#f0a020',
  succeeded: '#46d369',
  failed: '#ff5566',
  timed_out: '#ff5566',
  cancelled: '#6b7785',
  lost: '#ff5566',
}

/** Pulls the most useful human-readable text out of a Task's output/input
 * blob — `finalContent` for a chat-style turn, else a pretty-printed dump
 * of whatever's there. Returns null when there's genuinely nothing to show
 * (e.g. a still-running task with no output yet). */
function taskOutputText(t: AgentOsTask): string | null {
  const out = t.output
  if (out && typeof out.finalContent === 'string' && out.finalContent.trim()) return out.finalContent
  if (out && Object.keys(out).length) return JSON.stringify(out, null, 2)
  return null
}

function TaskRow({ t }: { t: AgentOsTask }) {
  const [open, setOpen] = useState(false)
  const Icon = STATUS_ICON[t.status]
  const output = taskOutputText(t)
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-panel-2/40"
      >
        <Chevron size={11} className="shrink-0 text-dim" />
        <Icon size={13} style={{ color: STATUS_COLOR[t.status] }} className={t.status === 'running' ? 'animate-spin' : undefined} />
        <span className="text-dim">{t.type}</span>
        <span className="truncate text-text/80">{t.agentId}</span>
        {t.flowId && <span className="rounded-sm bg-panel-2 px-1 text-[9px] text-dim">flow</span>}
        <span className="ml-auto text-[10px] uppercase tracking-wider" style={{ color: STATUS_COLOR[t.status] }}>
          {t.status}
        </span>
      </button>
      {open && (
        <div className="border-t border-line/40 bg-bg/40 px-3 py-2">
          {output ? (
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-text/80">{output}</pre>
          ) : (
            <p className="text-[11px] text-dim">
              {t.status === 'running' || t.status === 'queued' ? 'Still running — no output yet.' : 'No output recorded for this task.'}
            </p>
          )}
          {t.input && Object.keys(t.input).length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] text-dim">Input</summary>
              <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[10px] text-dim">
                {JSON.stringify(t.input, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

/** Real Agent-OS Tasks — the runtime's own execution ledger — filtered to
 * the selected agent when one is chosen. Click a row to expand its full
 * output (and input) — previously only a truncated Events-tab line ever
 * showed any of this. */
export function TasksTab({ agentId }: { agentId: string | null }) {
  const { tasks, loading, error } = useAgentOsTasks(agentId ? { agentId } : {})

  if (loading) return <p className="p-3 text-xs text-dim">Loading tasks…</p>
  if (error) return <p className="p-3 text-xs text-danger">{error}</p>
  if (!tasks.length) return <p className="p-3 text-xs text-dim">No tasks{agentId ? ' for this agent' : ''} yet.</p>

  return (
    <div className="divide-y divide-line/60">
      {tasks
        .slice()
        .reverse()
        .map((t) => (
          <TaskRow key={t.id} t={t} />
        ))}
    </div>
  )
}
