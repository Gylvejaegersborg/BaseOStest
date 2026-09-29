import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Ban, RotateCcw } from 'lucide-react'
import { cancelWork, fetchStale, reopenWork } from '@/features/agentos/client'
import { subscribeToEvents } from '@/features/agentos/sessionClient'
import type { AgentOsStaleEntry } from '@/features/agentos/types'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'

const EVENTS = ['work.claimed', 'work.completed', 'work.blocked', 'work.reopened', 'work.cancelled', 'agent.turn.end']

/**
 * What's stuck (agent-os's stale.ts): work whose run has gone quiet, runs
 * that only renew liveness, and runs that ended lost / timed out / failed
 * today. Paperclip's rule — surface it, don't quietly reassign it: the
 * only actions are yours (retry or cancel a stuck work item).
 */
export function NeedsALook({ agentId }: { agentId: string | null }) {
  const { agents } = useAgentOsContext()
  const [entries, setEntries] = useState<AgentOsStaleEntry[]>([])
  const refresh = useCallback(() => {
    fetchStale().then((r) => setEntries(r.stale), () => setEntries([]))
  }, [])
  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 60_000)
    const dispose = subscribeToEvents(EVENTS, () => refresh())
    return () => {
      window.clearInterval(id)
      dispose()
    }
  }, [refresh])

  const shown = entries.filter((e) => !agentId || e.agentId === agentId)
  if (!shown.length) return null
  const nameOf = (id: string) => agents.find((a) => a.id === id)?.name ?? id
  const act = (p: Promise<unknown>) => void p.then(refresh, (e) => window.alert(e instanceof Error ? e.message : String(e)))

  return (
    <div className="border-b border-line px-3 py-2.5">
      <div className="label mb-1.5 flex items-center gap-1.5 text-[#f0a020]">
        <AlertTriangle size={12} /> Needs a look · {shown.length}
      </div>
      <ul className="space-y-1.5 text-[11px]">
        {shown.map((e) => (
          <li key={`${e.kind}:${e.id}`} className="flex items-start gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-text/90">{e.title}</span>
              <span className="text-dim">
                {nameOf(e.agentId)} · {e.kind === 'work' ? 'work item' : 'run'} · {e.why}
              </span>
            </span>
            {e.kind === 'work' && (
              <span className="flex shrink-0 gap-1">
                <button onClick={() => act(reopenWork(e.id, 'stuck — retried by the operator'))} title="Start it again" className="flex items-center gap-1 border border-line px-1.5 py-0.5 text-dim hover:text-text">
                  <RotateCcw size={10} /> Retry
                </button>
                <button onClick={() => act(cancelWork(e.id, 'stuck — cancelled by the operator'))} title="Cancel it" className="flex items-center gap-1 px-1 py-0.5 text-dim hover:text-danger">
                  <Ban size={10} />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
