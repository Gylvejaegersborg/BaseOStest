import { useCallback, useEffect, useRef, useState } from 'react'
import { ThumbsUp, ThumbsDown, FileEdit, FilePlus, ShieldCheck, X, ChevronDown, ChevronRight } from 'lucide-react'
import { AGENTS } from '@/data/agents'
import { useAgentOsApprovals } from '@/features/agentos/useAgentOsApprovals'
import {
  addAllowRule,
  fetchAllowRules,
  fetchApproval,
  fetchRecentDecisions,
  removeAllowRule,
  type AgentOsAllowRule,
  type AgentOsApproval,
} from '@/features/agentos/sessionClient'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { isRealAgent } from '@/data/agents'
import { cn } from '@/lib/cn'

function agentColor(id: string): string {
  return AGENTS.find((a) => a.id === id)?.color ?? '#6b7785'
}

function agentName(id: string): string {
  return AGENTS.find((a) => a.id === id)?.name ?? id
}

const MAX_DIFF_CHARS = 4000

/** edit_file's whole call IS the diff — {old_string, new_string} needs no
 * computed line-matching, just a removed/added block each, the same shape
 * Claude Code/Codex render for a structured edit. write_file has no
 * "before" content available here (nothing proactively reads the file
 * just to build a preview), so it's shown as a flat "new content" block
 * instead of a diff. Caps each side so one huge edit doesn't blow out the
 * Approvals panel — this is a review surface, not a full file viewer. */
function ToolCallPreview({ approval }: { approval: AgentOsApproval }) {
  const { toolName, args } = approval

  if (toolName === 'edit_file' && typeof args.old_string === 'string' && typeof args.new_string === 'string') {
    const oldStr = args.old_string.slice(0, MAX_DIFF_CHARS)
    const newStr = args.new_string.slice(0, MAX_DIFF_CHARS)
    return (
      <div className="mb-1.5">
        {typeof args.path === 'string' && (
          <div className="mb-1 flex items-center gap-1.5 text-[10px] text-dim">
            <FileEdit size={11} /> <code className="text-text/80">{args.path}</code>
            {args.replace_all === true && <span className="rounded-sm bg-panel-2 px-1 text-[9px] uppercase tracking-wider">all occurrences</span>}
          </div>
        )}
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words border border-line bg-bg/60 p-1.5 text-[11px]">
          {oldStr.split('\n').map((line, i) => (
            <div key={`old-${i}`} className="bg-danger/10 text-danger">
              − {line}
            </div>
          ))}
          {newStr.split('\n').map((line, i) => (
            <div key={`new-${i}`} style={{ backgroundColor: '#46d36915', color: '#46d369' }}>
              + {line}
            </div>
          ))}
        </pre>
      </div>
    )
  }

  if (toolName === 'write_file' && typeof args.content === 'string') {
    const content = args.content.slice(0, MAX_DIFF_CHARS)
    return (
      <div className="mb-1.5">
        {typeof args.path === 'string' && (
          <div className="mb-1 flex items-center gap-1.5 text-[10px] text-dim">
            <FilePlus size={11} /> <code className="text-text/80">{args.path}</code>
            <span className="rounded-sm bg-panel-2 px-1 text-[9px] uppercase tracking-wider">new content</span>
          </div>
        )}
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words border border-line bg-bg/60 p-1.5 text-[11px]" style={{ color: '#46d369' }}>
          {content
            .split('\n')
            .map((line, i) => (
              <div key={i}>+ {line}</div>
            ))}
        </pre>
      </div>
    )
  }

  if (typeof args.command === 'string') {
    return <code className="mb-1.5 block max-w-full overflow-x-auto whitespace-pre text-[11px] text-text/85">{args.command}</code>
  }

  return <ArgsBlock args={args} />
}

function ArgsBlock({ args }: { args: Record<string, unknown> }) {
  return (
    <pre className="mb-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-words border border-line bg-bg/60 p-1.5 text-[11px] text-text/85">
      {JSON.stringify(args, null, 2)}
    </pre>
  )
}

const time = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'


/** Agent-OS tool-execution approvals: what's waiting (approve, always
 * allow, reject), recent decisions, and each agent's "always allow" list.
 * Unfiltered by the selected agent — a pending approval needs attention
 * whichever agent you're looking at. `focusId` opens one decision in full
 * (the chat's "Approved in Approvals" line links here). */
export function ApprovalsTab({ focusId }: { focusId?: string | null }) {
  const { connection, approvals, busyId, error, act } = useAgentOsApprovals()
  const [decisions, setDecisions] = useState<AgentOsApproval[]>([])
  const [allowTick, setAllowTick] = useState(0)

  const loadDecisions = useCallback(async () => {
    try {
      const recent = await fetchRecentDecisions()
      if (focusId && !recent.some((d) => d.id === focusId)) {
        const one = await fetchApproval(focusId).catch(() => null)
        if (one && one.status !== 'pending') recent.unshift(one)
      }
      setDecisions(recent)
    } catch {
      /* the pending list shows the connection error */
    }
  }, [focusId])
  // Re-read decisions whenever the pending list changes (something got decided).
  useEffect(() => {
    if (connection === 'live') void loadDecisions()
  }, [connection, approvals, loadDecisions])

  const decide = async (id: string, decision: 'approve' | 'reject', always?: 'tool' | 'exact') => {
    await act(id, decision, always)
    if (always) setAllowTick((t) => t + 1)
  }

  if (connection === 'unconfigured') {
    return <p className="p-3 text-xs text-dim">No Agent-OS gateway configured.</p>
  }
  if (connection === 'connecting') return <p className="p-3 text-xs text-dim">Connecting…</p>
  if (connection === 'error') {
    return <p className="p-3 text-xs text-danger">Agent-OS gateway unreachable{error ? `: ${error}` : ''}.</p>
  }

  return (
    <div className="space-y-4 p-2">
      {error && <p className="border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}

      <section>
        <div className="label mb-1.5 px-1">Waiting ({approvals.length})</div>
        {!approvals.length && (
          <p className="px-1 text-xs text-dim">Nothing waiting. Requests show up here when an agent wants to do something its permissions don't cover.</p>
        )}
        <div className="space-y-2">
          {approvals.map((a) => (
            <PendingCard key={a.id} approval={a} busy={busyId === a.id} onDecide={(d, always) => decide(a.id, d, always)} />
          ))}
        </div>
      </section>

      <section>
        <div className="label mb-1.5 px-1">Recent decisions</div>
        {!decisions.length && <p className="px-1 text-xs text-dim">None yet.</p>}
        <div className="space-y-1">
          {decisions.map((d) => (
            <DecisionRow key={d.id} decision={d} focused={d.id === focusId} />
          ))}
        </div>
      </section>

      <AllowlistEditor tick={allowTick} />
    </div>
  )
}

function PendingCard({
  approval: a,
  busy,
  onDecide,
}: {
  approval: AgentOsApproval
  busy: boolean
  onDecide: (d: 'approve' | 'reject', always?: 'tool' | 'exact') => void
}) {
  const { exactOnly } = useExactOnlyTools()
  const btn = 'flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] uppercase tracking-wider disabled:opacity-50'
  return (
    <div className="border border-line bg-bg/40 p-2">
      <div className="mb-1 flex items-center gap-2 text-[10px] text-dim">
        <span style={{ color: agentColor(a.agentId) }}>{agentName(a.agentId)}</span>
        <span>wants to run</span>
        <code className="text-text/80">{a.toolName}</code>
        <span>· {time(a.requestedAt)}</span>
      </div>
      <ToolCallPreview approval={a} />
      <p className="mb-2 text-[11px] text-dim">{a.reason}</p>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => onDecide('approve')} disabled={busy} className={btn} style={{ borderColor: '#46d36966', color: '#46d369', backgroundColor: '#46d36915' }}>
          <ThumbsUp size={12} /> Approve
        </button>
        <button onClick={() => onDecide('reject')} disabled={busy} className={cn(btn, 'border-danger/40 bg-danger/10 text-danger hover:bg-danger/20')}>
          <ThumbsDown size={12} /> Reject
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-dim">
        <ShieldCheck size={11} className="text-neon-green" /> Approve &amp; always allow:
        <button onClick={() => onDecide('approve', 'exact')} disabled={busy} className="border border-line px-1.5 py-0.5 hover:text-text disabled:opacity-50">
          this exact call
        </button>
        {!exactOnly.includes(a.toolName) && (
          <button onClick={() => onDecide('approve', 'tool')} disabled={busy} className="border border-line px-1.5 py-0.5 hover:text-text disabled:opacity-50">
            every <code>{a.toolName}</code> call
          </button>
        )}
      </div>
    </div>
  )
}

function DecisionRow({ decision: d, focused }: { decision: AgentOsApproval; focused: boolean }) {
  const [open, setOpen] = useState(focused)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focused) return
    setOpen(true)
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [focused])
  const approved = d.status === 'approved'
  const summary = typeof d.args.command === 'string' ? d.args.command : typeof d.args.path === 'string' ? d.args.path : JSON.stringify(d.args)
  return (
    <div ref={ref} className={cn('border bg-bg/30', focused ? 'border-accent/50' : 'border-line')}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px]">
        {open ? <ChevronDown size={11} className="shrink-0 text-dim" /> : <ChevronRight size={11} className="shrink-0 text-dim" />}
        <span className={approved ? 'text-neon-green' : 'text-danger'}>{approved ? 'approved' : 'rejected'}</span>
        <span style={{ color: agentColor(d.agentId) }}>{agentName(d.agentId)}</span>
        <code className="shrink-0 text-text/80">{d.toolName}</code>
        <span className="min-w-0 flex-1 truncate text-dim">{summary}</span>
        <span className="shrink-0 text-[10px] text-dim">{time(d.resolvedAt)}</span>
      </button>
      {open && (
        <div className="border-t border-line p-2">
          <ToolCallPreview approval={d} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10px]">
            <dt className="text-dim">why asked</dt>
            <dd className="text-text/80">{d.reason}</dd>
            <dt className="text-dim">requested</dt>
            <dd className="text-text/80">{time(d.requestedAt)}</dd>
            <dt className="text-dim">{approved ? 'approved' : 'rejected'}</dt>
            <dd className="text-text/80">
              {time(d.resolvedAt)}
              {d.resolvedBy ? ` by ${d.resolvedBy}` : ''}
            </dd>
            {approved && (
              <>
                <dt className="text-dim">ran</dt>
                <dd className="text-text/80">{d.usedAt ? time(d.usedAt) : 'not yet'}</dd>
              </>
            )}
            <dt className="text-dim">id</dt>
            <dd className="font-mono text-dim">{d.id}</dd>
          </dl>
        </div>
      )}
    </div>
  )
}

let exactOnlyCache: string[] = ['shell', 'write_file', 'edit_file', 'subagent']
function useExactOnlyTools() {
  return { exactOnly: exactOnlyCache }
}

const TOOL_CHOICES = ['basespace', 'basespace-add', 'recall-memory', 'skill', 'nominate-memory', 'record-artifact', 'read_file']

/** Each agent's "always allow" rules — rules added from an approval, the
 * defaults (reading/writing BaseSpace), and ones added here. */
function AllowlistEditor({ tick }: { tick: number }) {
  const { agents } = useAgentOsContext()
  const real = agents.filter(isRealAgent)
  const [agentId, setAgentId] = useState(real[0]?.id ?? 'claude')
  const [rules, setRules] = useState<AgentOsAllowRule[]>([])
  const [tool, setTool] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetchAllowRules(agentId)
      exactOnlyCache = res.exactOnlyTools
      setRules(res.rules)
      setErr('')
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [agentId])
  useEffect(() => {
    void load()
  }, [load, tick])

  const add = async () => {
    if (!tool) return
    try {
      await addAllowRule({ agentId, toolName: tool })
      setTool('')
      await load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }
  const remove = async (id: string) => {
    await removeAllowRule(id).catch((e) => setErr((e as Error).message))
    await load()
  }
  const has = (t: string) => rules.some((r) => r.toolName === t && !r.args)

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
        <span className="label">Always allowed</span>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="border border-line bg-bg/60 px-1.5 py-0.5 text-[11px] text-text focus:outline-none"
        >
          {real.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {err && <p className="mb-1 px-1 text-[11px] text-danger">{err}</p>}
      <div className="space-y-1">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center gap-2 border border-line bg-bg/30 px-2 py-1 text-[11px]">
            <code className="shrink-0 text-text/85">{r.toolName}</code>
            <span className="min-w-0 flex-1 truncate text-dim" title={r.args ? JSON.stringify(r.args) : undefined}>
              {r.args ? (typeof r.args.command === 'string' ? r.args.command : JSON.stringify(r.args)) : 'every call'}
              {r.note === 'default' && ' · default'}
            </span>
            <button onClick={() => remove(r.id)} title="Remove — this will ask for approval again" className="shrink-0 text-dim hover:text-danger">
              <X size={12} />
            </button>
          </div>
        ))}
        {!rules.length && <p className="px-1 text-[11px] text-dim">Nothing — every guarded action asks first.</p>}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 px-1">
        <select value={tool} onChange={(e) => setTool(e.target.value)} className="min-w-0 flex-1 border border-line bg-bg/60 px-1.5 py-1 text-[11px] text-text focus:outline-none">
          <option value="">Add a tool…</option>
          {TOOL_CHOICES.filter((t) => !has(t)).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button onClick={add} disabled={!tool} className="border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim hover:text-text disabled:opacity-40">
          Always allow
        </button>
      </div>
      <p className="mt-1 px-1 text-[10px] leading-snug text-dim">
        Shell commands and file edits can only be always-allowed one exact command at a time (from a request above), and git push always asks.
      </p>
    </section>
  )
}
