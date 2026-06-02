import { useEffect, useMemo, useRef, useState } from 'react'
import { Hash, Send, Check, X, Bot, ShieldQuestion } from 'lucide-react'
import { AGENTS } from '@/data/agents'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import { useDiscordBridge } from './useDiscordBridge'
import { GUILDS, MOCK_APPROVALS } from './mockData'
import type { Approval, BridgeMessage, ConnectionState } from './types'

interface DiscordDashPageProps {
  open: boolean
  onClose: () => void
}

const ACCENT = '#e0408a'

// Header status dot — colour + label reflect the live bridge connection.
const CONNECTION_META: Record<ConnectionState, { color: string; label: string; pulse: boolean }> = {
  connecting: { color: '#f0a020', label: 'Connecting…', pulse: true },
  live: { color: '#46d369', label: 'Connected', pulse: true },
  mock: { color: '#36e0c8', label: 'Demo · mock data', pulse: false },
  error: { color: '#ff5566', label: 'Bridge offline', pulse: false },
}

// Resolve an author id to name + colour for the approvals panel (which keys by
// agent id). Messages already carry their own display fields.
function approvalAuthor(authorId: string): { name: string; color: string } {
  const a = AGENTS.find((x) => x.id === authorId)
  return { name: a?.name ?? authorId, color: a?.color ?? '#6b7785' }
}

function initialsOf(name: string): string {
  return name
    .replace(/[·]/g, ' ')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function DiscordDashPage({ open, onClose }: DiscordDashPageProps) {
  const [guildId, setGuildId] = useState(GUILDS[0].id)
  const [activeChannel, setActiveChannel] = useState('')
  const { channels, messages, connection, markRead, send } = useDiscordBridge(guildId, activeChannel)

  const [approvals, setApprovals] = useState<Approval[]>(MOCK_APPROVALS)
  const [leaving, setLeaving] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState('')
  const [toast, setToast] = useState<{ text: string; color: string } | null>(null)

  const feedRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  const guild = GUILDS.find((g) => g.id === guildId)!
  const conn = CONNECTION_META[connection]

  // Keep a valid active channel as the channel list (re)loads.
  useEffect(() => {
    if (channels.length === 0) return
    if (!channels.some((c) => c.id === activeChannel)) {
      setActiveChannel(channels[0].id)
    }
  }, [channels, activeChannel])

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.channelId === activeChannel),
    [messages, activeChannel],
  )

  // Auto-scroll the feed to the bottom on mount and on channel/message change.
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeChannel, visibleMessages.length, open])

  const selectChannel = (id: string) => {
    setActiveChannel(id)
    markRead(id)
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
    const { name } = approvalAuthor(item.authorId)
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
      decision === 'approve' ? `Approved · ${name}'s action` : `Denied · ${name}'s action`,
      decision === 'approve' ? '#46d369' : '#ff5566',
    )
  }

  const submit = () => {
    const text = draft.trim()
    if (!text || !activeChannel) return
    void send(activeChannel, text)
    setDraft('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg font-mono text-text">
      {/* ── Header bar ───────────────────────────────────────────── */}
      <header className="flex items-center gap-3 border-b border-line bg-panel/60 px-4 py-2.5">
        <Bot size={18} style={{ color: ACCENT }} />
        <h1 className="font-display text-lg tracking-wider text-text">DISCORD BRIDGE</h1>
        <span
          className="flex items-center gap-1.5 border bg-bg/60 px-2 py-1 text-[11px]"
          style={{ borderColor: `${conn.color}55`, color: conn.color }}
        >
          <StatusDot color={conn.color} size={7} pulse={conn.pulse} /> {conn.label}
        </span>

        {/* Server switcher */}
        <div className="flex items-center gap-1">
          {GUILDS.map((g) => {
            const active = g.id === guildId
            return (
              <button
                key={g.id}
                onClick={() => setGuildId(g.id)}
                title={`${g.name} · ${g.id}`}
                className={cn(
                  'border px-2 py-1 text-[11px] uppercase tracking-wider transition-colors',
                  active
                    ? 'border-magenta/60 bg-magenta/15 text-text'
                    : 'border-line text-dim hover:border-magenta/40 hover:text-text',
                )}
              >
                {g.name}
              </button>
            )
          })}
        </div>

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
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-dim">
            {guild.name} · Channels
          </div>
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
            <span className="text-text">{activeChannel || '—'}</span>
          </div>

          <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-3">
            {visibleMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-dim">
                No messages in #{activeChannel || 'this channel'} yet.
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
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder={activeChannel ? `Message #${activeChannel}` : 'Select a channel'}
                className="flex-1 bg-transparent text-sm text-text placeholder:text-dim focus:outline-none"
              />
              <button
                onClick={submit}
                disabled={!draft.trim() || !activeChannel}
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
            {approvals.length > 0 && <span className="ml-auto text-dim">{approvals.length}</span>}
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

function MessageRow({ message }: { message: BridgeMessage }) {
  const name = message.isSelf ? 'You' : message.authorName
  const color = message.authorColor ?? '#6b7785'
  const initials = initialsOf(name)
  return (
    <div className="group flex gap-3 py-1.5 animate-fade-in">
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold" style={{ color }}>
            {name}
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
  const { name, color } = approvalAuthor(approval.authorId)
  return (
    <div
      className={cn(
        'mb-2 border border-line bg-bg/50 p-2.5 transition-all duration-300',
        leaving ? 'translate-x-3 opacity-0' : 'opacity-100',
      )}
    >
      <div className="flex items-center gap-1.5">
        <StatusDot color={color} size={7} />
        <span className="text-xs font-semibold" style={{ color }}>
          {name}
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
