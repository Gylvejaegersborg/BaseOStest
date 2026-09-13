import { useEffect, useRef, useState } from 'react'
import { Mic, Paperclip, Send, Square, X, Bot, AlertTriangle, Eye } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import type { Agent } from '@/data/agents'
import type { useAgentOsChat, ChatMessage } from '@/features/agentos/useAgentOsChat'

interface Attachment {
  id: string
  name: string
  size: number
  kind: 'file' | 'audio'
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * The workbench's center pane in "chat" mode — message list, composer,
 * attachments, streaming. `agent` and `chat` are owned by AgentWorkspace
 * (one useAgentOsChat instance shared with ThreadHeader, which lives in
 * the top strip now) so switching threads there is reflected here without
 * a second, independent session subscription.
 */
export function ConversationPane({ agent, chat }: { agent: Agent; chat: ReturnType<typeof useAgentOsChat> }) {
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Attachment[]>([])
  const [dragging, setDragging] = useState(false)
  const [planMode, setPlanMode] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

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
    chat.send(withAttachments, planMode)
    setDraft('')
    setPending([])
  }

  const notReady = chat.connection === 'unconfigured' || chat.connection === 'error'

  return (
    <div
      className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
    >
      {notReady && (
        <div className="flex items-start gap-2 border-b border-line bg-amber/10 px-3 py-2 text-[11px] text-amber/90">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {chat.connection === 'unconfigured' ? (
            <span>
              No Agent-OS gateway configured. Set <code className="text-text/80">VITE_AGENT_OS_GATEWAY_URL</code> (see{' '}
              <code className="text-text/80">.env.example</code>) and reload.
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
        {chat.streaming && chat.streamingText && (
          <MessageRow msg={{ id: '__streaming', role: 'assistant', text: chat.streamingText, time: '' }} agentColor={agent.color} agentName={agent.name} />
        )}
        {chat.streaming && !chat.streamingText && (
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
        {planMode && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-dim">
            <Eye size={12} /> Plan mode: {agent.name} can only inspect this turn — shell/file edits/delegation are blocked by the harness, not just
            asked not to.
          </p>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setPlanMode((p) => !p)}
            title={planMode ? 'Plan mode on — click to allow real changes again' : 'Plan mode off — click to inspect only, no real changes'}
            className={cn(
              'border p-2 transition-colors',
              planMode ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line text-dim hover:border-accent/60 hover:text-accent',
            )}
          >
            <Eye size={16} />
          </button>
          <button onClick={() => fileRef.current?.click()} className="border border-line p-2 text-dim hover:border-accent/60 hover:text-accent" title="Attach file">
            <Paperclip size={16} />
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          <MicButton onClip={(att) => setPending((p) => [...p, att])} />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
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
    </div>
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
