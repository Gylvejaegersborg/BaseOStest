import { CheckCircle2, XCircle, Clock, Loader2, Ban, HelpCircle } from 'lucide-react'
import { useAgentOsTasks } from '@/features/agentos/useAgentOsTasks'
import type { AgentOsTaskStatus } from '@/features/agentos/sessionClient'

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

/** Real Agent-OS Tasks — the runtime's own execution ledger — filtered to
 * the selected agent when one is chosen. */
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
        .map((t) => {
          const Icon = STATUS_ICON[t.status]
          return (
            <div key={t.id} className="flex items-center gap-2 px-3 py-2 text-xs">
              <Icon size={13} style={{ color: STATUS_COLOR[t.status] }} className={t.status === 'running' ? 'animate-spin' : undefined} />
              <span className="text-dim">{t.type}</span>
              <span className="truncate text-text/80">{t.agentId}</span>
              {t.flowId && <span className="rounded-sm bg-panel-2 px-1 text-[9px] text-dim">flow</span>}
              <span className="ml-auto text-[10px] uppercase tracking-wider" style={{ color: STATUS_COLOR[t.status] }}>
                {t.status}
              </span>
            </div>
          )
        })}
    </div>
  )
}
