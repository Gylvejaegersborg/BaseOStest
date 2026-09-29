import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, History, RotateCcw } from 'lucide-react'
import { fetchAgentRevisions, restoreAgentRevision } from '@/features/agentos/client'
import type { AgentOsAgentConfig, AgentOsRevision } from '@/features/agentos/types'

const LABEL: Record<keyof AgentOsAgentConfig, string> = {
  name: 'name',
  role: 'role',
  persona: 'persona',
  reportsTo: 'reports to',
  defaultModel: 'model',
  budget: 'budget',
}

function show(k: keyof AgentOsAgentConfig, c: AgentOsAgentConfig): string {
  const v = c[k]
  if (k === 'budget') return c.budget ? `${c.budget.limitTokens.toLocaleString()} tokens / ${c.budget.period}` : 'none'
  if (k === 'reportsTo') return (v as string) ?? 'you'
  if (k === 'defaultModel') return (v as string) ?? 'gateway default'
  const s = (v as string | undefined) ?? '—'
  return s.length > 140 ? `${s.slice(0, 140)}…` : s
}

/**
 * An agent's config over time — name, role, persona, reporting line, model
 * and budget (agent-os's governance.ts folds them out of the event log) —
 * with "restore". A restore is a new revision; nothing is rewritten, so a
 * restore can itself be undone.
 */
export function AgentHistory({ agentId, onRestored }: { agentId: string; onRestored: () => void }) {
  const [open, setOpen] = useState(false)
  const [revisions, setRevisions] = useState<AgentOsRevision[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  const load = useCallback(() => {
    fetchAgentRevisions(agentId).then(setRevisions, (e) => setError(e instanceof Error ? e.message : String(e)))
  }, [agentId])
  useEffect(() => {
    if (open && !revisions) load()
  }, [open, revisions, load])

  const restore = async (rev: number) => {
    if (!window.confirm(`Bring this agent back to revision ${rev}? The current config stays in the history.`)) return
    setBusy(rev)
    setError('')
    try {
      setRevisions(await restoreAgentRevision(agentId, rev))
      onRestored()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const latest = revisions?.length ? revisions[revisions.length - 1]!.rev : undefined
  return (
    <div className="border border-line bg-bg/30">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[11px] text-dim hover:text-text">
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <History size={11} /> History{revisions ? ` · ${revisions.length} revisions` : ''}
      </button>
      {open && (
        <div className="max-h-64 space-y-1.5 overflow-y-auto border-t border-line/60 px-2 py-2 text-[11px]">
          {!revisions && !error && <p className="text-dim">Loading…</p>}
          {error && <p className="text-danger">{error}</p>}
          {revisions
            ?.slice()
            .reverse()
            .map((r) => (
              <div key={r.rev} className="flex items-start gap-2">
                <span className="w-7 shrink-0 text-dim">#{r.rev}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-dim">
                    {new Date(r.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {r.rev === 1 ? ' · created' : r.restoredFrom ? ` · restored #${r.restoredFrom}` : ''}
                    {r.rev === latest && <span className="text-accent"> · current</span>}
                  </p>
                  {r.changed.map((k) => (
                    <p key={k} className="truncate text-text/80" title={show(k, r.config)}>
                      <span className="text-dim">{LABEL[k]}: </span>
                      {show(k, r.config)}
                    </p>
                  ))}
                </div>
                {r.rev !== latest && (
                  <button
                    onClick={() => void restore(r.rev)}
                    disabled={busy !== null}
                    title="Restore this revision's whole config"
                    className="flex shrink-0 items-center gap-1 border border-line px-1.5 py-0.5 text-dim hover:border-accent/50 hover:text-text disabled:opacity-50"
                  >
                    <RotateCcw size={10} /> {busy === r.rev ? '…' : 'Restore'}
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
