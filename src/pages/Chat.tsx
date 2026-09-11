import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mic, Paperclip, Send, Square, X, Bot, Plus, MessagesSquare, ChevronDown, AlertTriangle } from 'lucide-react'
import { AGENTS } from '@/data/agents'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import { useAgentOsChat, type ChatMessage } from '@/features/agentos/useAgentOsChat'
import type { AgentOsSession } from '@/features/agentos/sessionClient'

interface Attachment {
  id: string
  name: string
  size: number
  kind: 'file' | 'audio'
}

// Every real (non-sub-agent) entry in the roster is a genuine Agent-OS
// agent (seeded by the gateway's seedDefaultAgents()) — there is no more
// "reserved for another model, not connected yet" special-casing, so
// unlike before, Chat isn't artificially limited to the first three. All
// of them currently share whichever single model the gateway process
// itself is configured with (see gateway/server.ts's GatewayDeps —
// per-agent model routing is a documented future step, not yet wired
// into the turns route). The two nyx-w* sub-agents are presentational
// only (MeetingRoom's simulated worker fan-out) and have no Agent-OS
// identity to open a real session against.
const CHAT_AGENTS = AGENTS.filter((a) => !a.id.includes('-w'))

/** Deep-linking from MeetingRoom/Team ("open in Chat") — Phase 7's
 * cross-navigation move: the three pages are views over the same
 * runtime, so jumping from "here's what Claude is doing" straight into
 * a conversation with Claude should just work via a plain URL. */
function initialAgentId(param: string | null): string {
  return param && CHAT_AGENTS.some((a) => a.id === param) ? param : CHAT_AGENTS[0].id
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function sessionLabel(s: AgentOsSession): string {
  return s.title || new Date(s.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function Chat() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [agentId, setAgentId] = useState(() => initialAgentId(searchParams.get('agent')))
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Attachment[]>([])
  const [dragging, setDragging] = useState(false)
  const [threadsOpen, setThreadsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const chat = useAgentOsChat(agentId)
  const agent = CHAT_AGENTS.find((a) => a.id === agentId)!

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat.messages, chat.streaming])

  const addFiles = (files: FileList | null) => {
    if (!files) return
    setPending((p) => [...p, ...Array.from(files).map((f) => ({
      id: crypto.randomUUID(), name: f.name, size: f.size, kind: 'file' as const,
    }))])
  }

  const send = () => {
    if (chat.streaming) {
      chat.cancel()
      return
    }
    if (!draft.trim() && !pending.length) return
    const withAttachments = pending.length
      ? `${draft.trim()}\n\n[attached: ${pending.map((a) => a.name).join(', ')}]`
      : draft.trim()
    chat.send(withAttachments)
    setDraft('')
    setPending([])
  }

  const notReady = chat.connection === 'unconfigured' || chat.connection === 'error'

  return (
    <div
      className="flex h-full"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
    >
      {/* Threads (desktop rail) — real Agent-OS sessions for the selected agent */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-line bg-panel/40 lg:flex">
        <div className="flex items-center justify-between border-b border-line p-3">
          <span className="label">Threads</span>
          <button onClick={() => chat.newSession()} disabled={chat.connection !== 'ready'} className="text-dim hover:text-accent disabled:opacity-40">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ThreadList sessions={chat.sessions} sessionId={chat.sessionId} onSelect={chat.switchSession} />
        </div>
        <div className="flex items-center gap-2 border-t border-line px-3 py-2 text-[11px] text-dim">
          <StatusDot color={chat.connection === 'ready' ? '#46d369' : notReady ? '#ff6b6b' : '#e3d24b'} size={6} />
          {chat.connection === 'ready' && 'Agent-OS connected'}
          {chat.connection === 'connecting' && 'Connecting…'}
          {chat.connection === 'unconfigured' && 'Agent-OS not configured'}
          {chat.connection === 'error' && 'Agent-OS unreachable'}
        </div>
      </aside>

      {/* Thread */}
      <section className="relative flex min-w-0 flex-1 flex-col">
        {/* Mobile thread switcher */}
        <div className="relative border-b border-line lg:hidden">
          <button
            onClick={() => setThreadsOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
          >
            <MessagesSquare size={15} className="shrink-0 text-dim" />
            <span className="min-w-0 flex-1 truncate text-sm text-text">
              {chat.sessions.find((s) => s.id === chat.sessionId) ? sessionLabel(chat.sessions.find((s) => s.id === chat.sessionId)!) : 'New chat'}
            </span>
            <span className="text-[10px] text-dim">{agent.name}</span>
            <ChevronDown size={15} className={cn('shrink-0 text-dim transition-transform', threadsOpen && 'rotate-180')} />
          </button>
          {threadsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setThreadsOpen(false)} />
              <div className="absolute inset-x-0 top-full z-40 max-h-[60vh] overflow-y-auto border-b border-line-2 bg-panel shadow-glow animate-fade-in">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <span className="label">Threads</span>
                  <button onClick={() => chat.newSession()} disabled={chat.connection !== 'ready'} className="text-dim hover:text-accent disabled:opacity-40">
                    <Plus size={14} />
                  </button>
                </div>
                <ThreadList
                  sessions={chat.sessions}
                  sessionId={chat.sessionId}
                  onSelect={(id) => { chat.switchSession(id); setThreadsOpen(false) }}
                />
              </div>
            </>
          )}
        </div>

        {/* Agent selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 sm:px-4">
          {CHAT_AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => { setAgentId(a.id); setSearchParams({ agent: a.id }, { replace: true }) }}
              className={cn(
                'flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors',
                a.id === agentId ? 'text-text' : 'border-line text-dim hover:text-text',
              )}
              style={a.id === agentId ? { borderColor: `${a.color}66`, color: a.color } : undefined}
            >
              <StatusDot color={a.color} size={6} /> {a.name}
            </button>
          ))}
          <span className="ml-auto hidden text-[10px] text-dim sm:inline">{agent.model}</span>
        </div>

        {/* Not-configured / unreachable banner — replaces the old API-key panel.
            There is no credential to enter here: Agent-OS holds provider
            credentials server-side (env vars on the gateway process), not
            in the browser. */}
        {notReady && (
          <div className="flex items-start gap-2 border-b border-line bg-amber/10 px-3 py-2 text-[11px] text-amber/90">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {chat.connection === 'unconfigured' ? (
              <span>
                No Agent-OS gateway configured. Set <code className="text-text/80">VITE_AGENT_OS_GATEWAY_URL</code> to a running
                gateway (see <code className="text-text/80">.env.example</code>) and reload.
              </span>
            ) : (
              <span>Agent-OS gateway configured but unreachable{chat.errorText ? `: ${chat.errorText}` : ''}. Retrying…</span>
            )}
          </div>
        )}

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {chat.messages.length === 0 && !notReady && (
            <p className="text-center text-xs text-dim">Session open. Type a message to start.</p>
          )}
          {chat.messages.map((m) => (
            <MessageRow key={m.id} msg={m} agentColor={agent.color} agentName={agent.name} />
          ))}
          {chat.streaming && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center border text-[10px]" style={{ borderColor: `${agent.color}66`, color: agent.color }}>
                <Bot size={14} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent/60" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                {chat.workingOn && <span className="text-[10px] text-dim">running {chat.workingOn}…</span>}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-line p-3">
          {pending.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pending.map((a) => (
                <span key={a.id} className="flex items-center gap-1.5 border border-line bg-panel-2 px-2 py-1 text-[11px]">
                  {a.kind === 'audio' ? <Mic size={11} className="text-magenta" /> : <Paperclip size={11} className="text-accent" />}
                  <span className="max-w-[160px] truncate">{a.name}</span>
                  <span className="text-dim">{fmtSize(a.size)}</span>
                  <button onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))} className="text-dim hover:text-danger">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => fileRef.current?.click()} className="border border-line p-2 text-dim hover:border-accent/60 hover:text-accent" title="Attach file">
              <Paperclip size={16} />
            </button>
            <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            <MicButton onClip={(att) => setPending((p) => [...p, att])} />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              rows={1}
              disabled={notReady}
              placeholder={chat.streaming ? 'Receiving…' : notReady ? 'Agent-OS not connected' : `Message ${agent.name}…`}
              className="max-h-32 min-h-[40px] flex-1 resize-none border border-line bg-bg/60 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent/60 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={notReady}
              className={cn(
                'border p-2 transition-colors disabled:opacity-40',
                chat.streaming
                  ? 'border-danger/40 bg-danger/10 text-danger hover:bg-danger/20'
                  : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
              )}
              title={chat.streaming ? 'Stop' : 'Send'}
            >
              {chat.streaming ? <Square size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>

        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center border-2 border-dashed border-accent/60 bg-bg/80 backdrop-blur-sm">
            <span className="font-display text-accent">DROP FILES TO ATTACH</span>
          </div>
        )}
      </section>
    </div>
  )
}

function ThreadList({ sessions, sessionId, onSelect }: { sessions: AgentOsSession[]; sessionId: string | null; onSelect: (id: string) => void }) {
  if (!sessions.length) {
    return <p className="px-3 py-4 text-center text-[11px] text-dim">No threads yet.</p>
  }
  return (
    <>
      {[...sessions]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              'flex w-full flex-col gap-0.5 border-l-2 px-3 py-2.5 text-left transition-colors',
              s.id === sessionId ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-panel-2/50',
            )}
          >
            <span className="flex items-center justify-between text-xs text-text">
              <span className="truncate">{sessionLabel(s)}</span>
              {s.status !== 'active' && <span className="text-[9px] text-dim">{s.status}</span>}
            </span>
          </button>
        ))}
    </>
  )
}

function MessageRow({ msg, agentColor, agentName }: { msg: ChatMessage; agentColor: string; agentName: string }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center border text-[10px]"
        style={{ borderColor: isUser ? '#2a3442' : `${agentColor}66`, color: isUser ? '#6b7785' : agentColor }}
      >
        {isUser ? 'YOU' : <Bot size={14} />}
      </div>
      <div className={cn('max-w-[72%]', isUser && 'text-right')}>
        <div className="mb-1 flex items-center gap-2 text-[10px] text-dim" style={isUser ? { justifyContent: 'flex-end' } : undefined}>
          <span>{isUser ? 'You' : agentName}</span>
          {msg.time && <span>{msg.time}</span>}
        </div>
        <div
          className={cn('inline-block border px-3 py-2 text-sm', isUser ? 'border-line bg-panel-2 text-text' : 'border-line bg-panel/70 text-text/90')}
          style={!isUser ? { borderColor: `${agentColor}33` } : undefined}
        >
          {msg.text && <p className="whitespace-pre-wrap text-left">{msg.text}</p>}
        </div>
      </div>
    </div>
  )
}

function MicButton({ onClip }: { onClip: (att: { id: string; name: string; size: number; kind: 'audio' }) => void }) {
  const [recording, setRecording] = useState(false)
  const [secs, setSecs] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<number | null>(null)

  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
  }

  const start = async () => {
    setSecs(0)
    setRecording(true)
    timerRef.current = window.setInterval(() => setSecs((s) => s + 1), 1000)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      recorderRef.current = rec
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => chunks.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        onClip({ id: crypto.randomUUID(), name: `voice-${Date.now()}.webm`, size: blob.size, kind: 'audio' })
        stream.getTracks().forEach((t) => t.stop())
      }
      rec.start()
    } catch {
      recorderRef.current = null
    }
  }

  const stop = () => {
    setRecording(false)
    stopTimer()
    if (recorderRef.current) recorderRef.current.stop()
    else onClip({ id: crypto.randomUUID(), name: `voice-${Date.now()}.webm`, size: secs * 16000, kind: 'audio' })
  }

  useEffect(() => () => stopTimer(), [])

  return (
    <button
      onClick={recording ? stop : start}
      className={cn(
        'flex items-center gap-1.5 border p-2 transition-colors',
        recording ? 'border-magenta/60 bg-magenta/10 text-magenta' : 'border-line text-dim hover:border-magenta/60 hover:text-magenta',
      )}
      title={recording ? 'Stop recording' : 'Record voice'}
    >
      {recording ? <Square size={16} /> : <Mic size={16} />}
      {recording && (
        <span className="flex items-center gap-1.5 text-[11px] tabular-nums">
          <StatusDot color="#e0408a" pulse size={6} />
          {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
        </span>
      )}
    </button>
  )
}
