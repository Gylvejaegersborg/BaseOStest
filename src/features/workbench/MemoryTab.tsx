import { useState } from 'react'
import { Brain, ThumbsUp, ThumbsDown, ChevronDown, ChevronRight } from 'lucide-react'
import { useAgentOsMemory } from '@/features/agentos/useAgentOsMemory'
import type { EpisodicKind } from '@/features/agentos/sessionClient'

const KIND_LABEL: Record<EpisodicKind, string> = {
  preference: 'preference',
  correction: 'correction',
  fact: 'fact',
  outcome: 'outcome',
  'skill-candidate': 'skill candidate',
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/**
 * "What has this agent learned" — the Workbench's answer to a question the
 * runtime could only answer before by reading raw event logs directly.
 * Three layers, matching agent-os's own memory.ts model exactly so nothing
 * here implies more than the backend actually guarantees:
 *   1. Curated memory — MEMORY.md/USER.md-equivalent prose, the ONLY thing
 *      actually injected into this agent's future turns. Written solely by
 *      the deterministic dreaming pass, never directly by a conversation.
 *   2. Pending nominations — the agent's own bounded "I think this matters"
 *      voice, with zero effect until approved/rejected here.
 *   3. Episodic log — the full fast-path write history behind both of the
 *      above, for when "what exactly did it see" is the real question.
 */
export function MemoryTab({ agentId }: { agentId: string | null }) {
  const { summary, episodic, nominations, loading, error, approve, reject } = useAgentOsMemory(agentId)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showEpisodic, setShowEpisodic] = useState(false)

  if (!agentId) return <p className="p-3 text-xs text-dim">Select an agent to see what it's learned.</p>
  if (loading) return <p className="p-3 text-xs text-dim">Loading memory…</p>
  if (error) return <p className="p-3 text-xs text-danger">{error}</p>
  if (!summary) return null

  const act = async (fn: (id: string) => Promise<void>, id: string) => {
    setBusyId(id)
    try {
      await fn(id)
    } finally {
      setBusyId(null)
    }
  }

  const promotedLastPass = summary.lastDreamingPass?.promotions.filter((p) => p.eligible).length ?? 0

  return (
    <div className="p-2">
      <div className="mb-3 flex items-center gap-2 border border-line bg-bg/40 p-2 text-[11px] text-dim">
        <Brain size={13} className="shrink-0 text-accent" />
        {summary.lastDreamingPass ? (
          <span>
            Last reviewed {timeAgo(summary.lastDreamingPass.ranAt)} · {summary.episodicCount} episodic entr{summary.episodicCount === 1 ? 'y' : 'ies'}{' '}
            · {promotedLastPass} currently eligible
          </span>
        ) : (
          <span>Never reviewed yet — a background pass runs every few minutes once there's something to review.</span>
        )}
      </div>

      <div className="mb-3">
        <span className="label mb-1 block">Curated memory</span>
        <p className="mb-1.5 text-[10px] text-dim">Durable facts, procedures, environment notes — injected into every turn.</p>
        {summary.curated.content ? (
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words border border-line bg-bg/40 p-2 text-[11px] text-text/80">
            {summary.curated.content}
          </pre>
        ) : (
          <p className="border border-line bg-bg/20 p-2 text-[11px] text-dim">Nothing curated yet.</p>
        )}
      </div>

      <div className="mb-3">
        <span className="label mb-1 block">User profile</span>
        <p className="mb-1.5 text-[10px] text-dim">Preferences learned about you specifically.</p>
        {summary.curated.userProfile ? (
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words border border-line bg-bg/40 p-2 text-[11px] text-text/80">
            {summary.curated.userProfile}
          </pre>
        ) : (
          <p className="border border-line bg-bg/20 p-2 text-[11px] text-dim">Nothing curated yet.</p>
        )}
      </div>

      <div className="mb-3">
        <span className="label mb-1 block">Pending nominations</span>
        <p className="mb-1.5 text-[10px] text-dim">
          Things the agent itself flagged as worth remembering — zero effect on its memory until you approve or reject.
        </p>
        {!nominations.length && <p className="border border-line bg-bg/20 p-2 text-[11px] text-dim">Nothing pending.</p>}
        <div className="space-y-1.5">
          {nominations.map((n) => (
            <div key={n.id} className="border border-line bg-bg/40 p-2">
              <div className="mb-1 flex items-center gap-2 text-[10px] text-dim">
                <span className="rounded-sm bg-panel-2 px-1 text-[9px] uppercase tracking-wider">{KIND_LABEL[n.kind]}</span>
                <span>{timeAgo(n.nominatedAt)}</span>
              </div>
              <p className="mb-2 text-[11px] text-text/85">{n.content}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => act((id) => approve(id), n.id)}
                  disabled={busyId === n.id}
                  className="flex items-center gap-1.5 border px-2.5 py-1 text-[11px] uppercase tracking-wider disabled:opacity-50"
                  style={{ borderColor: '#46d36966', color: '#46d369', backgroundColor: '#46d36915' }}
                >
                  <ThumbsUp size={12} /> Approve
                </button>
                <button
                  onClick={() => act((id) => reject(id), n.id)}
                  disabled={busyId === n.id}
                  className="flex items-center gap-1.5 border border-danger/40 bg-danger/10 px-2.5 py-1 text-[11px] uppercase tracking-wider text-danger hover:bg-danger/20 disabled:opacity-50"
                >
                  <ThumbsDown size={12} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button onClick={() => setShowEpisodic((s) => !s)} className="mb-1.5 flex items-center gap-1 text-[11px] text-dim hover:text-text">
          {showEpisodic ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="label">Episodic log ({episodic.length})</span>
        </button>
        {showEpisodic && (
          <div className="space-y-1">
            {!episodic.length && <p className="border border-line bg-bg/20 p-2 text-[11px] text-dim">Nothing written yet.</p>}
            {episodic
              .slice()
              .reverse()
              .map((e) => (
                <div key={e.id} className="border border-line/60 bg-bg/30 px-2 py-1.5 text-[11px]">
                  <div className="mb-0.5 flex items-center gap-2 text-[10px] text-dim">
                    <span className="rounded-sm bg-panel-2 px-1 text-[9px] uppercase tracking-wider">{KIND_LABEL[e.kind]}</span>
                    {e.wasExplicitCorrection && <span className="text-accent">correction</span>}
                    {e.taskOutcome === 'failure' && <span className="text-danger">failure</span>}
                    {e.repetitionCount > 0 && <span>seen {e.repetitionCount}×</span>}
                    <span className="ml-auto">{timeAgo(e.timestamp)}</span>
                  </div>
                  <p className="text-text/80">{e.content}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
