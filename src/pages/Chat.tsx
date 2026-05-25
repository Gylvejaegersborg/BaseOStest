import { useEffect, useRef, useState } from 'react'
import { Mic, Paperclip, Send, Square, X, Bot, Plus } from 'lucide-react'
import { AGENTS } from '@/data/agents'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'

interface Attachment {
  id: string
  name: string
  size: number
  kind: 'file' | 'audio'
}
interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  attachments?: Attachment[]
  time: string
}

const CHAT_AGENTS = AGENTS.slice(0, 3)
const CONVERSATIONS = [
  { id: 'c1', title: 'Release plan Q3', agent: 'Hemera', preview: 'Three windows, here is the draft…' },
  { id: 'c2', title: 'Beat DB schema', agent: 'Claude', preview: 'Added waveform previews to…' },
  { id: 'c3', title: 'Content batch', agent: 'Nyx', preview: 'Spun up 4 workers for…' },
  { id: 'c4', title: 'Homeserver tunnel', agent: 'Claude', preview: 'watchtower auto-updates next' },
]

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function Chat() {
  const [agentId, setAgentId] = useState(CHAT_AGENTS[0].id)
  const [convoId, setConvoId] = useState('c1')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm0',
      role: 'assistant',
      text: 'Channel open. I am a UI stub for now — no model is wired in yet. Try attaching a file or recording a voice note; the affordances are real.',
      time: '09:12',
    },
  ])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Attachment[]>([])
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const agent = CHAT_AGENTS.find((a) => a.id === agentId)!

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const next = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      kind: 'file' as const,
    }))
    setPending((p) => [...p, ...next])
  }

  const send = () => {
    if (!draft.trim() && !pending.length) return
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: draft.trim(),
      attachments: pending,
      time: now,
    }
    setMessages((m) => [...m, userMsg])
    setDraft('')
    setPending([])
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `[${agent.name} backend not connected] — received your message${
            userMsg.attachments?.length ? ` and ${userMsg.attachments.length} attachment(s)` : ''
          }. Once the local agent is online this is where the reply streams in.`,
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }, 650)
  }

  return (
    <div
      className="flex h-full"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        addFiles(e.dataTransfer.files)
      }}
    >
      {/* Conversations */}
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-line bg-panel/40">
        <div className="flex items-center justify-between border-b border-line p-3">
          <span className="label">Threads</span>
          <Plus size={14} className="text-dim hover:text-accent" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {CONVERSATIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => setConvoId(c.id)}
              className={cn(
                'flex w-full flex-col gap-0.5 border-l-2 px-3 py-2.5 text-left transition-colors',
                c.id === convoId ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-panel-2/50',
              )}
            >
              <span className="flex items-center justify-between text-xs text-text">
                {c.title}
                <span className="text-[9px] text-dim">{c.agent}</span>
              </span>
              <span className="truncate text-[10px] text-dim">{c.preview}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Thread */}
      <section className="relative flex min-w-0 flex-1 flex-col">
        {/* Agent selector */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          {CHAT_AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAgentId(a.id)}
              className={cn(
                'flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors',
                a.id === agentId ? 'text-text' : 'border-line text-dim hover:text-text',
              )}
              style={a.id === agentId ? { borderColor: `${a.color}66`, color: a.color } : undefined}
            >
              <StatusDot color={a.color} size={6} /> {a.name}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-dim">{agent.model}</span>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m) => (
            <MessageRow key={m.id} msg={m} agentColor={agent.color} agentName={agent.name} />
          ))}
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
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder={`Message ${agent.name}…`}
              className="max-h-32 min-h-[40px] flex-1 resize-none border border-line bg-bg/60 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent/60 focus:outline-none"
            />
            <button onClick={send} className="border border-accent/40 bg-accent/10 p-2 text-accent transition-colors hover:bg-accent/20" title="Send">
              <Send size={16} />
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

function MessageRow({ msg, agentColor, agentName }: { msg: Message; agentColor: string; agentName: string }) {
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
          <span>{msg.time}</span>
        </div>
        <div
          className={cn('inline-block border px-3 py-2 text-sm', isUser ? 'border-line bg-panel-2 text-text' : 'border-line bg-panel/70 text-text/90')}
          style={!isUser ? { borderColor: `${agentColor}33` } : undefined}
        >
          {msg.text && <p className="whitespace-pre-wrap text-left">{msg.text}</p>}
          {msg.attachments?.map((a) => (
            <span key={a.id} className="mt-1 flex items-center gap-1.5 text-[11px] text-dim">
              {a.kind === 'audio' ? <Mic size={11} /> : <Paperclip size={11} />} {a.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function MicButton({ onClip }: { onClip: (att: Attachment) => void }) {
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
        onClip({ id: crypto.randomUUID(), name: `voice-note-${Date.now()}.webm`, size: blob.size, kind: 'audio' })
        stream.getTracks().forEach((t) => t.stop())
      }
      rec.start()
    } catch {
      // permission denied / unsupported — keep the timer running as a mock
      recorderRef.current = null
    }
  }

  const stop = () => {
    setRecording(false)
    stopTimer()
    if (recorderRef.current) {
      recorderRef.current.stop()
    } else {
      onClip({ id: crypto.randomUUID(), name: `voice-note-${Date.now()}.webm`, size: secs * 16000, kind: 'audio' })
    }
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
