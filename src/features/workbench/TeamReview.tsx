import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Loader2, MessageSquare } from 'lucide-react'
import { fetchReviewDigest, fetchReviews, runReviewNow } from '@/features/agentos/client'
import { subscribeToEvents } from '@/features/agentos/sessionClient'
import type { AgentOsReview, AgentOsReviewDigest } from '@/features/agentos/types'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'

const EVENTS = ['work.created', 'work.completed', 'work.blocked', 'work.reassigned', 'work.reopened', 'work.cancelled', 'work.escalated', 'agent.turn.end']

function ago(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  return m < 60 ? `${m}m ago` : m < 48 * 60 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`
}

/**
 * Team review — a lead (anyone with reports, e.g. Hemera) looks over its
 * team's work: what's blocked, handed back, or gone quiet (agent-os's
 * core/review.ts). The counts here come from the same digest the lead gets
 * and cost nothing to show; the lead only spends tokens when something
 * needs it and changed since its last review. "Review now" runs one anyway.
 * Shown for the selected agent if it leads a team, or for every lead.
 */
export function TeamReview({ agentId }: { agentId: string | null }) {
  const [leads, setLeads] = useState<string[] | null>(null)
  const [reviews, setReviews] = useState<AgentOsReview[]>([])
  const refresh = useCallback(() => {
    fetchReviews()
      .then((r) => {
        setLeads(r.leads)
        setReviews(r.reviews)
      })
      .catch(() => setLeads([]))
  }, [])
  useEffect(() => {
    refresh()
    return subscribeToEvents(['agent.turn.end'], () => refresh())
  }, [refresh])

  if (!leads) return null
  const shown = agentId ? leads.filter((l) => l === agentId) : leads
  if (!shown.length) return null
  return (
    <div className="border-b border-line">
      {shown.map((lead) => (
        <LeadReview key={lead} lead={lead} last={reviews.find((r) => r.agentId === lead)} onRan={refresh} />
      ))}
    </div>
  )
}

function LeadReview({ lead, last, onRan }: { lead: string; last?: AgentOsReview; onRan: () => void }) {
  const { agents } = useAgentOsContext()
  const navigate = useNavigate()
  const [digest, setDigest] = useState<AgentOsReviewDigest | null>(null)
  const [running, setRunning] = useState(false)
  const [note, setNote] = useState('')
  const name = agents.find((a) => a.id === lead)?.name ?? lead

  const load = useCallback(() => {
    fetchReviewDigest(lead).then(setDigest, () => setDigest(null))
  }, [lead])
  useEffect(() => {
    load()
    return subscribeToEvents(EVENTS, () => load())
  }, [load])

  const reviewNow = async () => {
    setRunning(true)
    setNote('')
    try {
      const r = await runReviewNow(lead)
      if (!r.ran) setNote(r.reason ?? 'Not run.')
      onRan()
      load()
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const chips: [string, number, string][] = digest
    ? [
        ['blocked', digest.blocked.length, '#ff5566'],
        ['handed back', digest.handedBack.length, '#f0a020'],
        ['quiet', digest.stale.length, '#6b7785'],
        ['waiting on you', digest.escalated.length, '#c084fc'],
      ]
    : []

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={13} className="text-accent" />
        <span className="label flex-1">Team review · {name}</span>
        {last && (
          <button
            onClick={() => navigate(`/workbench?agent=${encodeURIComponent(lead)}&session=${encodeURIComponent(last.sessionId)}`)}
            title="Open the review thread"
            className="flex items-center gap-1 text-[11px] text-dim hover:text-accent"
          >
            <MessageSquare size={11} /> Thread
          </button>
        )}
        <button
          onClick={() => void reviewNow()}
          disabled={running}
          title="Runs a review turn now, even if nothing changed"
          className="flex items-center gap-1 border border-line px-2 py-0.5 text-[11px] text-dim hover:border-accent/50 hover:text-text disabled:opacity-50"
        >
          {running ? <Loader2 size={11} className="animate-spin" /> : null}
          {running ? 'Reviewing…' : 'Review now'}
        </button>
      </div>
      {digest && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
          {chips.map(([label, n, color]) => (
            <span key={label} className="border border-line px-1.5 py-0.5" style={n ? { color, borderColor: `${color}66` } : { color: '#6b7785' }}>
              {n} {label}
            </span>
          ))}
          {digest.idleGoals.length > 0 && (
            <span className="border border-line px-1.5 py-0.5 text-dim" title={digest.idleGoals.join(', ')}>
              {digest.idleGoals.length} goal{digest.idleGoals.length === 1 ? '' : 's'} with no work
            </span>
          )}
        </div>
      )}
      {digest && digest.escalated.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-[11px]">
          {digest.escalated.map((i) => (
            <li key={i.id} className="text-[#c084fc]">
              “{i.title}” — {i.why}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[11px] text-dim">
        {last ? (
          <>
            Last review {ago(last.at)}
            {last.tokens > 0 && ` · ${last.tokens >= 1000 ? `${(last.tokens / 1000).toFixed(1)}k` : last.tokens} tok`}
            {last.summary && <span className="mt-0.5 block whitespace-pre-wrap text-text/75">{last.summary}</span>}
          </>
        ) : (
          `${name} reviews when something is blocked, handed back or quiet for a day — no tokens spent while the team is fine.`
        )}
      </p>
      {note && <p className="mt-1 text-[11px] text-dim">{note}</p>}
    </div>
  )
}
