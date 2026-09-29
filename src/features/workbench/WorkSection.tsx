import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Ban, CheckCircle2, ChevronDown, ChevronRight, CircleDot, Loader2, OctagonAlert, Plus, RotateCcw } from 'lucide-react'
import { assignWork, cancelWork, fetchWork, reassignWork, reopenWork } from '@/features/agentos/client'
import { subscribeToEvents } from '@/features/agentos/sessionClient'
import type { AgentOsWork, AgentOsWorkStatus } from '@/features/agentos/types'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { useGoals } from '@/features/goals/store'
import { useProjects } from '@/features/projects/store'
import { cn } from '@/lib/cn'

const STATUS: Record<AgentOsWorkStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  open: { icon: CircleDot, color: '#6b7785', label: 'waiting' },
  in_progress: { icon: Loader2, color: '#f0a020', label: 'working' },
  blocked: { icon: OctagonAlert, color: '#ff5566', label: 'blocked' },
  done: { icon: CheckCircle2, color: '#46d369', label: 'done' },
  cancelled: { icon: Ban, color: '#6b7785', label: 'cancelled' },
}

const WORK_EVENTS = ['work.created', 'work.claimed', 'work.completed', 'work.blocked', 'work.reassigned', 'work.reopened', 'work.cancelled', 'work.escalated']

function fmtTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function useWork(agentId: string | null) {
  const [work, setWork] = useState<AgentOsWork[] | null>(null)
  const [error, setError] = useState('')
  const refresh = useCallback(() => {
    // A lead sees its reports' work too — the same view its team review uses.
    fetchWork(agentId ? { team: agentId } : {})
      .then((w) => {
        setWork(w)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [agentId])
  useEffect(() => {
    refresh()
    const dispose = subscribeToEvents(WORK_EVENTS, () => refresh())
    const id = window.setInterval(refresh, 30_000)
    return () => {
      dispose()
      window.clearInterval(id)
    }
  }, [refresh])
  return { work, error, refresh }
}

/**
 * Work handed between agents — Paperclip-style tracked hand-offs (agent-os's
 * core/work.ts) instead of agents asking each other in chat. Shows who has
 * what, who asked, the result or the blocker, and tokens spent including
 * everything it was split into. Assign lets the operator hand an agent a
 * piece of work directly; it runs in the background, one at a time.
 */
export function WorkSection({ agentId }: { agentId: string | null }) {
  const { work, error, refresh } = useWork(agentId)
  const [assigning, setAssigning] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  if (error && !work) return <p className="p-3 text-xs text-dim">Work isn&apos;t available ({error}).</p>
  if (!work) return <p className="p-3 text-xs text-dim">Loading work…</p>

  // What a lead escalated to you comes first.
  const active = work
    .filter((w) => w.status === 'open' || w.status === 'in_progress' || w.status === 'blocked')
    .sort((a, b) => Number(!!b.escalation) - Number(!!a.escalation))
  const closed = work.filter((w) => w.status === 'done' || w.status === 'cancelled')

  return (
    <div className="border-b border-line">
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="label">Work · {active.length} active</span>
        <button onClick={() => setAssigning((a) => !a)} className="flex items-center gap-1 text-[11px] text-dim hover:text-accent">
          <Plus size={11} /> Assign
        </button>
      </div>
      {assigning && <AssignForm defaultAssignee={agentId} onDone={() => { setAssigning(false); refresh() }} />}
      {!work.length && <p className="px-3 pb-3 text-[11px] text-dim">No work handed around yet. Agents hand each other work with `delegate`; you can assign it here.</p>}
      <div className="divide-y divide-line/40">
        {active.map((w) => (
          <WorkRow key={w.id} w={w} onChanged={refresh} />
        ))}
      </div>
      {closed.length > 0 && (
        <>
          <button onClick={() => setShowClosed((s) => !s)} className="flex w-full items-center gap-1 px-3 py-2 text-left text-[11px] text-dim hover:text-text">
            {showClosed ? <ChevronDown size={11} /> : <ChevronRight size={11} />} {closed.length} done / cancelled
          </button>
          {showClosed && (
            <div className="divide-y divide-line/40">
              {closed.slice(0, 30).map((w) => (
                <WorkRow key={w.id} w={w} onChanged={refresh} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function WorkRow({ w, onChanged }: { w: AgentOsWork; onChanged: () => void }) {
  const [open, setOpen] = useState(w.status === 'blocked' || !!w.escalation)
  const { agents } = useAgentOsContext()
  const goals = useGoals()
  const projects = useProjects()
  const nameOf = (id: string) => (id === 'operator' ? 'You' : (agents.find((a) => a.id === id)?.name ?? id))
  const focusName = w.focus ? (w.focus.kind === 'goal' ? goals.find((g) => g.id === w.focus!.id)?.title : projects.find((p) => p.id === w.focus!.id)?.name) : undefined
  const s = STATUS[w.status]
  const Icon = s.icon
  const act = (p: Promise<unknown>) => void p.then(onChanged, (e) => window.alert(e instanceof Error ? e.message : String(e)))

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-panel-2/40">
        <Icon size={13} style={{ color: s.color }} className={cn('mt-0.5 shrink-0', w.status === 'in_progress' && 'animate-spin')} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-text/90">{w.title}</span>
          <span className="flex flex-wrap items-center gap-1 text-[10px] text-dim">
            {nameOf(w.requestedBy)} <ArrowRight size={9} /> {nameOf(w.assignee)}
            <span style={{ color: s.color }}>· {s.label}</span>
            {w.escalation && <span className="text-[#c084fc]">· needs you</span>}
            {w.depth > 0 && <span>· hand-off {w.depth}</span>}
            {focusName && <span className="truncate text-[#f0a020]/80">· {focusName}</span>}
            {w.totalTokens > 0 && <span>· {fmtTokens(w.totalTokens)} tok</span>}
          </span>
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-line/40 bg-bg/40 px-3 py-2 text-[11px]">
          {w.detail && <p className="whitespace-pre-wrap text-text/75">{w.detail}</p>}
          {w.result && <p className="whitespace-pre-wrap text-text/85"><span className="text-[#46d369]">Result: </span>{w.result}</p>}
          {w.blockedReason && w.status === 'blocked' && <p className="text-danger">Blocked: {w.blockedReason}</p>}
          {w.escalation && (
            <p className="text-[#c084fc]">
              {nameOf(w.escalation.by)} needs you: {w.escalation.reason}
            </p>
          )}
          {w.notes.length > 0 && (
            <details>
              <summary className="cursor-pointer text-dim">History · {w.notes.length}</summary>
              <ul className="mt-1 space-y-0.5 text-dim">
                {w.notes.map((n, i) => (
                  <li key={i}>
                    {new Date(n.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {nameOf(n.by)}: {n.text}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {w.childIds.length > 0 && <p className="text-dim">Split into {w.childIds.length} hand-off{w.childIds.length === 1 ? '' : 's'} — tokens include theirs.</p>}
          {(w.status === 'open' || w.status === 'in_progress' || w.status === 'blocked') && (
            <div className="flex flex-wrap items-center gap-1.5">
              {w.status === 'blocked' && (
                <button onClick={() => act(reopenWork(w.id, 'unblocked by the operator'))} className="flex items-center gap-1 border border-line px-2 py-0.5 text-dim hover:border-accent/50 hover:text-text">
                  <RotateCcw size={10} /> Retry
                </button>
              )}
              <select
                value=""
                onChange={(e) => e.target.value && act(reassignWork(w.id, e.target.value, 'reassigned by the operator'))}
                className="border border-line bg-bg px-1.5 py-0.5 text-[11px] text-dim"
              >
                <option value="">Give to…</option>
                {agents
                  .filter((a) => a.id !== w.assignee && !a.id.includes('-w'))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
              <button onClick={() => act(cancelWork(w.id, 'cancelled by the operator'))} className="flex items-center gap-1 px-1 py-0.5 text-dim hover:text-danger">
                <Ban size={10} /> Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AssignForm({ defaultAssignee, onDone }: { defaultAssignee: string | null; onDone: () => void }) {
  const { agents } = useAgentOsContext()
  const goals = useGoals()
  const projects = useProjects()
  const [assignee, setAssignee] = useState(defaultAssignee ?? '')
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [serves, setServes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!assignee || !title.trim()) return
    setBusy(true)
    setError('')
    const [kind, id] = serves.split(/:(.*)/s)
    try {
      await assignWork({
        assignee,
        title: title.trim(),
        ...(detail.trim() ? { detail: detail.trim() } : {}),
        ...(kind === 'goal' || kind === 'project' ? { focus: { kind, id } } : {}),
      })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full border border-line bg-bg/60 px-2 py-1 text-xs text-text outline-none focus:border-accent/50'
  return (
    <div className="space-y-1.5 px-3 pb-3">
      <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={input}>
        <option value="">Who does it?</option>
        {agents
          .filter((a) => !a.id.includes('-w'))
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {a.role}
            </option>
          ))}
      </select>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What to do (e.g. Draft three captions for the teaser)" className={input} />
      <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Context, constraints, what done looks like (optional)" rows={2} className={cn(input, 'resize-y')} />
      <select value={serves} onChange={(e) => setServes(e.target.value)} className={input}>
        <option value="">Serves… (optional — gives the agent the why)</option>
        {goals.filter((g) => g.status === 'active').length > 0 && (
          <optgroup label="Goals">
            {goals
              .filter((g) => g.status === 'active')
              .map((g) => (
                <option key={g.id} value={`goal:${g.id}`}>
                  {g.title}
                </option>
              ))}
          </optgroup>
        )}
        <optgroup label="Projects">
          {projects
            .filter((p) => p.status === 'active')
            .map((p) => (
              <option key={p.id} value={`project:${p.id}`}>
                {p.name}
              </option>
            ))}
        </optgroup>
      </select>
      {error && <p className="text-[11px] text-danger">{error}</p>}
      <button
        onClick={() => void submit()}
        disabled={busy || !assignee || !title.trim()}
        className="w-full border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] uppercase tracking-wider text-accent hover:bg-accent/20 disabled:opacity-40"
      >
        {busy ? 'Assigning…' : 'Assign — runs in the background'}
      </button>
    </div>
  )
}
