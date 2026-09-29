import { useCallback, useEffect, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { fetchAgent, pauseAgent, resumeAgent, setAgentBudget } from '@/features/agentos/client'
import type { AgentOsControl } from '@/features/agentos/types'
import { cn } from '@/lib/cn'

type Period = 'day' | 'week' | 'month'
const PERIOD_LABEL: Record<Period, string> = { day: 'today', week: 'this week', month: 'this month' }

function fmt(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

/**
 * The operator's live levers over one agent (agent-os's controls.ts, adapted
 * from Paperclip's board powers): pause/resume, and a token budget per
 * period that stops new turns at the limit — chat, flows, crons, heartbeats
 * alike — and lifts on its own when the period rolls over. Tokens, not
 * money: that's what providers report, and a subscription isn't billed per
 * token anyway.
 */
export function BoardControls({ agentId, onChanged }: { agentId: string; onChanged?: () => void }) {
  const [control, setControl] = useState<AgentOsControl | null>(null)
  const [unsupported, setUnsupported] = useState(false)
  const [period, setPeriod] = useState<Period>('month')
  const [limit, setLimit] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const apply = useCallback((c: AgentOsControl) => {
    setControl(c)
    setPeriod(c.budget?.period ?? c.period)
    setLimit(c.budget ? String(c.budget.limitTokens) : '')
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAgent(agentId)
      .then((a) => {
        if (cancelled) return
        if (a.control) apply(a.control)
        else setUnsupported(true)
      })
      .catch(() => !cancelled && setUnsupported(true))
    return () => {
      cancelled = true
    }
  }, [agentId, apply])

  const run = async (action: () => Promise<AgentOsControl>) => {
    setBusy(true)
    setError('')
    try {
      apply(await action())
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (unsupported) return null
  if (!control) return <p className="text-[11px] text-dim">Loading controls…</p>

  const limitNum = Number(limit)
  const limitValid = limit.trim() === '' || (Number.isFinite(limitNum) && limitNum > 0)
  const pct = control.budget ? Math.min(100, (control.usedTokens / control.budget.limitTokens) * 100) : 0
  const status = control.blocked === 'paused' ? `Paused — ${control.paused?.reason}` : control.blocked === 'budget' ? 'Over budget — new turns are refused' : 'Running'

  return (
    <div className="space-y-2 border border-line p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="label">Controls</span>
        <span className={cn('text-[11px]', control.blocked ? 'text-[#f0a020]' : 'text-dim')}>{status}</span>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] text-dim">
          {fmt(control.usedTokens)} tokens {PERIOD_LABEL[control.period]}
          {control.budget && ` of ${fmt(control.budget.limitTokens)}`}
        </p>
        {control.budget && (
          <div className="h-1 w-full bg-line">
            <div className={cn('h-1', pct >= 100 ? 'bg-danger' : pct >= control.budget.warnAt * 100 ? 'bg-[#f0a020]' : 'bg-accent')} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="border border-line bg-bg/40 px-1.5 py-1 text-xs text-text outline-none"
        >
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
        <input
          value={limit}
          onChange={(e) => setLimit(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="token limit (empty = none)"
          className="min-w-0 flex-1 border border-line bg-bg/40 px-2 py-1 text-xs text-text outline-none focus:border-accent/50"
        />
        <button
          onClick={() => void run(() => setAgentBudget(agentId, { period, limitTokens: limit.trim() ? limitNum : null }))}
          disabled={busy || !limitValid}
          className="border border-line px-2 py-1 text-[11px] text-dim hover:border-accent/50 hover:text-text disabled:opacity-40"
        >
          Save budget
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {control.paused ? (
          <button
            onClick={() => void run(() => resumeAgent(agentId))}
            disabled={busy}
            className="flex items-center gap-1 border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] text-accent hover:bg-accent/20 disabled:opacity-40"
          >
            <Play size={11} /> Resume
          </button>
        ) : (
          <>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="reason (optional)"
              className="min-w-0 flex-1 border border-line bg-bg/40 px-2 py-1 text-xs text-text outline-none focus:border-accent/50"
            />
            <button
              onClick={() => void run(() => pauseAgent(agentId, reason.trim() || undefined))}
              disabled={busy}
              className="flex items-center gap-1 border border-line px-2 py-1 text-[11px] text-dim hover:border-[#f0a020]/60 hover:text-text disabled:opacity-40"
            >
              <Pause size={11} /> Pause
            </button>
          </>
        )}
      </div>
      <p className="text-[10px] text-dim">
        Paused or over budget: chat, flows, crons and heartbeats stop for this agent. A budget lifts on its own when the
        period rolls over (UTC). A turn already running finishes.
      </p>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  )
}
