import { useEffect, useMemo, useRef, useState } from 'react'
import { Hash, Send, Check, X, Bot, ShieldQuestion } from 'lucide-react'
import { AGENTS } from '@/data/agents'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'

interface DiscordDashPageProps {
  open: boolean
  onClose: () => void
}

const ACCENT = '#e0408a'

interface Channel {
  id: string
  name: string
  unread: number
}

const CHANNELS: Channel[] = [
  { id: 'general', name: 'general', unread: 0 },
  { id: 'agent-log', name: 'agent-log', unread: 12 },
  { id: 'approvals', name: 'approvals', unread: 3 },
  { id: 'music-drops', name: 'music-drops', unread: 5 },
  { id: 'ops-alerts', name: 'ops-alerts', unread: 1 },
]

interface Message {
  id: string
  channel: string
  /** agent id, or 'you' for the operator */
  author: string
  time: string
  text: string
}

const byId = (id: string) => AGENTS.find((a) => a.id === id)

// Visual identity for an author — covers agents plus the human operator.
function authorMeta(author: string): { name: string; color: string; initials: string } {
  if (author === 'you') return { name: 'You', color: '#c8d2dc', initials: 'YO' }
  const agent = byId(author)
  if (!agent) return { name: author, color: '#6b7785', initials: author.slice(0, 2).toUpperCase() }
  const initials = agent.name
    .replace(/[·]/g, ' ')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return { name: agent.name, color: agent.color, initials }
}

const INITIAL_MESSAGES: Message[] = [
  { id: 'm1', channel: 'general', author: 'hemera', time: '08:02', text: 'Morning brief is up. Three release windows queued for Q3 — sharing the draft in #music-drops.' },
  { id: 'm2', channel: 'general', author: 'you', time: '08:05', text: 'Nice. Push the week-2 promo earlier, it looked thin.' },
  { id: 'm3', channel: 'general', author: 'hemera', time: '08:06', text: 'On it. Re-spacing the cadence and flagging Nyx for the assets.' },
  { id: 'm4', channel: 'general', author: 'claude', time: '08:14', text: 'Calendar grid refactor landed. Week view is stable now, tests green.' },

  { id: 'm5', channel: 'agent-log', author: 'nyx', time: '08:20', text: 'Spun up 4 workers for the content batch.' },
  { id: 'm6', channel: 'agent-log', author: 'nyx-w1', time: '08:21', text: 'Caption set drafted — tightening the hooks.' },
  { id: 'm7', channel: 'agent-log', author: 'nyx-w2', time: '08:23', text: 'Cover-art prompts done. Idling until the next request.' },
  { id: 'm8', channel: 'agent-log', author: 'claude', time: '08:31', text: 'Found a null deref in the upload routine, patched it. Pushing the branch.' },
  { id: 'm9', channel: 'agent-log', author: 'nyx', time: '08:40', text: 'Worker 2 stalled on a rate limit, retrying with backoff.' },

  { id: 'm10', channel: 'music-drops', author: 'hemera', time: '08:45', text: 'Q3 plan draft attached. Window 1 opens July 7.' },
  { id: 'm11', channel: 'music-drops', author: 'nyx-w1', time: '08:52', text: 'Release captions ready for review — 6 variants per track.' },
  { id: 'm12', channel: 'music-drops', author: 'you', time: '09:01', text: 'Love variant 3. Lock it for the lead single.' },

  { id: 'm13', channel: 'approvals', author: 'nyx', time: '09:10', text: 'Requesting approval to publish the lead-single captions to the scheduler.' },
  { id: 'm14', channel: 'approvals', author: 'claude', time: '09:12', text: 'Requesting approval to merge branch `fix/upload-null-deref` into main.' },

  { id: 'm15', channel: 'ops-alerts', author: 'nyx', time: '09:18', text: '⚠ Upload queue backed up — master from song routines still pending.' },
]

interface Approval {
  id: string
  author: string
  action: string
}

const INITIAL_APPROVALS: Approval[] = [
  { id: 'a1', author: 'nyx', action: 'Publish lead-single captions to the post scheduler' },
  { id: 'a2', author: 'claude', action: 'Merge branch fix/upload-null-deref → main' },
  { id: 'a3', author: 'hemera', action: 'Send Q3 release calendar to the team channel' },
  { id: 'a4', author: 'nyx-w2', action: 'Spend 4 image credits on cover-art upscale' },
]

export function DiscordDashPage({ open, onClose }: DiscordDashPageProps) {
  const [activeChannel, setActiveChannel] = useState('general')
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [approvals, setApprovals] = useState<Approval[]>(INITIAL_APPROVALS)
  // ids of approvals currently animating out, so we can fade before removing.
  const [leaving, setLeaving] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState('')
  const [toast, setToast] = useState<{ text: string; color: string } | null>(null)
  const [channels, setChannels] = useState<Channel[]>(CHANNELS)

  const feedRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.channel === activeChannel),
    [messages, activeChannel],
  )

  // Auto-scroll the feed to the bottom on mount and whenever the channel
  // changes or a new message arrives.
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeChannel, visibleMessages.length, open])

  // Clear unread badge when a channel is opened.
  const selectChannel = (id: string) => {
    setActiveChannel(id)
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)))
  }

  // Esc closes the overlay (same pattern as BeatStorePage).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = (text: string, color: string) => {
    setToast({ text, color })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  const resolveApproval = (id: string, decision: 'approve' | 'deny') => {
    const item = approvals.find((a) => a.id === id)
    if (!item) return
    const meta = authorMeta(item.author)
    // fade out, then drop from the list.
    setLeaving((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setApprovals((prev) => prev.filter((a) => a.id !== id))
      setLeaving((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 280)
    showToast(
      decision === 'approve'
        ? `Approved · ${meta.name}'s action`
        : `Denied · ${meta.name}'s action`,
      decision === 'approve' ? '#46d369' : '#ff5566',
    )
  }

  const send = () => {
    const text = draft.trim()
    if (!text) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, channel: activeChannel, author: 'you', time, text },
    ])
    setDraft('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg font-mono text-text">
      {/* ── Header bar ───────────────────────────────────────────── */}
      <header className="flex items-center gap-3 border-b border-line bg-panel/60 px-4 py-2.5">
        <Bot size={18} style={{ color: ACCENT }} />
        <h1 className="font-display text-lg tracking-wider text-text">DISCORD BRIDGE</h1>
        <span className="flex items-center gap-1.5 border border-line bg-bg/60 px-2 py-1 text-[11px] text-dim">
          <StatusDot color="#46d369" size={7} pulse /> Connected
        </span>
        <span className="text-xs text-dim">
          server <span className="text-text">ISΛRK HQ</span>
        </span>
        <button
          onClick={onClose}
          className="ml-auto flex items-center gap-1 border border-line px-2.5 py-1 text-[11px] uppercase tracking-wider text-dim transition-colors hover:border-magenta/60 hover:text-magenta"
        >
          Close <X size={13} />
        </button>
      </header>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Channel list */}
        <nav className="hidden w-[200px] shrink-0 flex-col border-r border-line bg-panel/30 sm:flex">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-dim">Channels</div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {channels.map((c) => {
              const active = c.id === activeChannel
              return (
                <button
                  key={c.id}
                  onClick={() => selectChannel(c.id)}
                  className={cn(
                    'group mb-0.5 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm transition-colors',
                    active ? 'bg-magenta/15 text-text' : 'text-dim hover:bg-panel-2 hover:text-text',
                  )}
                >
                  <Hash size={14} style={{ color: active ? ACCENT : undefined }} />
                  <span className="flex-1 truncate">{c.name}</span>
                  {c.unread > 0 && (
                    <span
                      className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-bg"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {c.unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Message feed + composer */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5 border-b border-line px-4 py-2 text-sm">
            <Hash size={15} style={{ color: ACCENT }} />
            <span className="text-text">{activeChannel}</span>
          </div>

          <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-3">
            {visibleMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-dim">
                No messages in #{activeChannel} yet.
              </div>
            ) : (
              visibleMessages.map((m) => <MessageRow key={m.id} message={m} />)
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-line bg-panel/40 px-4 py-3">
            <div className="flex items-center gap-2 border border-line bg-bg/60 px-3 py-2 focus-within:border-magenta/60">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={`Message #${activeChannel}`}
                className="flex-1 bg-transparent text-sm text-text placeholder:text-dim focus:outline-none"
              />
              <button
                onClick={send}
                disabled={!draft.trim()}
                className="flex items-center gap-1 text-dim transition-colors hover:text-magenta disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </main>

        {/* Approvals panel */}
        <aside className="hidden w-[260px] shrink-0 flex-col border-l border-line bg-panel/30 lg:flex">
          <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-widest text-dim">
            <ShieldQuestion size={13} style={{ color: ACCENT }} />
            Pending Approvals
            {approvals.length > 0 && (
              <span className="ml-auto text-dim">{approvals.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {approvals.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-dim">
                All clear — nothing awaiting approval.
              </div>
            ) : (
              approvals.map((a) => (
                <ApprovalCard
                  key={a.id}
                  approval={a}
                  leaving={leaving.has(a.id)}
                  onApprove={() => resolveApproval(a.id, 'approve')}
                  onDeny={() => resolveApproval(a.id, 'deny')}
                />
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 animate-fade-in border bg-panel px-4 py-2 text-xs shadow-glow-magenta"
          style={{ borderColor: `${toast.color}66`, color: toast.color }}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}

function MessageRow({ message }: { message: Message }) {
  const meta = authorMeta(message.author)
  return (
    <div className="group flex gap-3 py-1.5 animate-fade-in">
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ backgroundColor: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}55` }}
      >
        {meta.initials}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold" style={{ color: meta.color }}>
            {meta.name}
          </span>
          <span className="text-[10px] text-dim">{message.time}</span>
        </div>
        <p className="text-sm leading-relaxed text-text/90">{message.text}</p>
      </div>
    </div>
  )
}

function ApprovalCard({
  approval,
  leaving,
  onApprove,
  onDeny,
}: {
  approval: Approval
  leaving: boolean
  onApprove: () => void
  onDeny: () => void
}) {
  const meta = authorMeta(approval.author)
  return (
    <div
      className={cn(
        'mb-2 border border-line bg-bg/50 p-2.5 transition-all duration-300',
        leaving ? 'translate-x-3 opacity-0' : 'opacity-100',
      )}
    >
      <div className="flex items-center gap-1.5">
        <StatusDot color={meta.color} size={7} />
        <span className="text-xs font-semibold" style={{ color: meta.color }}>
          {meta.name}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-text/85">{approval.action}</p>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={onApprove}
          className="flex flex-1 items-center justify-center gap-1 border border-neon-green/40 bg-neon-green/10 py-1.5 text-[11px] uppercase tracking-wider text-neon-green transition-colors hover:bg-neon-green/20"
        >
          <Check size={12} /> Approve
        </button>
        <button
          onClick={onDeny}
          className="flex flex-1 items-center justify-center gap-1 border border-danger/40 bg-danger/10 py-1.5 text-[11px] uppercase tracking-wider text-danger transition-colors hover:bg-danger/20"
        >
          <X size={12} /> Deny
        </button>
      </div>
    </div>
  )
}
