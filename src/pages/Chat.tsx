import { useEffect, useRef, useState } from 'react'
import { Mic, Paperclip, Send, Square, X, Bot, Plus, MessagesSquare, ChevronDown, Key, Eye, EyeOff } from 'lucide-react'
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

// Only Claude is wired to the Anthropic API. Nyx and Hemera are reserved for other models.
const AGENT_MODEL: Record<string, string> = {
  claude: 'claude-opus-4-8',
}

const AGENT_SYSTEM: Record<string, string> = {
  claude: 'You are Claude, a builder and code assistant embedded in a personal OS dashboard. Be concise and technical.',
}

// OAuth access tokens (sk-ant-oat01-…) must use Authorization: Bearer plus the
// oauth beta header; only plain API keys (sk-ant-api…) go on x-api-key.
function authHeaders(token: string): Record<string, string> {
  if (!token.startsWith('sk-ant-') || token.startsWith('sk-ant-oat')) {
    return {
      'Authorization': `Bearer ${token}`,
      'anthropic-beta': 'oauth-2025-04-20',
    }
  }
  return { 'x-api-key': token }
}

// Claude OAuth (PKCE) — the same public client + flow Claude Code uses for
// subscription sign-in. The callback page displays a code the user pastes back.
const OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e'
const OAUTH_REDIRECT = 'https://console.anthropic.com/oauth/code/callback'
const OAUTH_VERIFIER_KEY = 'os:chat:oauthVerifier'

function base64url(bytes: Uint8Array) {
  let s = ''
  bytes.forEach((b) => { s += String.fromCharCode(b) })
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function buildOauthUrl(): Promise<string> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  localStorage.setItem(OAUTH_VERIFIER_KEY, verifier)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = base64url(new Uint8Array(digest))
  const url = new URL('https://claude.ai/oauth/authorize')
  url.searchParams.set('code', 'true')
  url.searchParams.set('client_id', OAUTH_CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', OAUTH_REDIRECT)
  url.searchParams.set('scope', 'org:create_api_key user:profile user:inference')
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', verifier)
  return url.toString()
}

async function exchangeOauthCode(pasted: string): Promise<string> {
  const verifier = localStorage.getItem(OAUTH_VERIFIER_KEY)
  if (!verifier) throw new Error('Sign-in session expired — click the sign-in link again.')
  const [code, state] = pasted.trim().split('#')
  const res = await fetch('https://console.anthropic.com/v1/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      state: state ?? verifier,
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: OAUTH_REDIRECT,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed (HTTP ${res.status})`)
  const data = await res.json()
  if (!data?.access_token) throw new Error('No access token in response')
  localStorage.removeItem(OAUTH_VERIFIER_KEY)
  return data.access_token as string
}

const CHAT_AGENTS = AGENTS.slice(0, 3)
const CONVERSATIONS = [
  { id: 'c1', title: 'Release plan Q3', agent: 'Hemera' },
  { id: 'c2', title: 'Beat DB schema', agent: 'Claude' },
  { id: 'c3', title: 'Content batch', agent: 'Nyx' },
  { id: 'c4', title: 'Homeserver tunnel', agent: 'Claude' },
]

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function loadHistory(convoId: string): Message[] {
  try {
    const stored = localStorage.getItem(`os:chat:${convoId}`)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveHistory(convoId: string, messages: Message[]) {
  try { localStorage.setItem(`os:chat:${convoId}`, JSON.stringify(messages.slice(-100))) }
  catch { /* quota */ }
}

export function Chat() {
  const [agentId, setAgentId] = useState(CHAT_AGENTS[0].id)
  const [convoId, setConvoId] = useState('c1')
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = loadHistory('c1')
    if (stored.length) return stored
    return [{ id: 'm0', role: 'assistant', text: 'Channel open. Type a message to start.', time: fmtTime() }]
  })
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Attachment[]>([])
  const [dragging, setDragging] = useState(false)
  const [threadsOpen, setThreadsOpen] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('os:chat:apiKey') ?? '')
  const [showKeyPanel, setShowKeyPanel] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const agent = CHAT_AGENTS.find((a) => a.id === agentId)!
  const convo = CONVERSATIONS.find((c) => c.id === convoId) ?? CONVERSATIONS[0]

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const switchConvo = (id: string) => {
    setConvoId(id)
    const stored = loadHistory(id)
    setMessages(stored.length ? stored : [{ id: 'm0', role: 'assistant', text: 'Channel open.', time: fmtTime() }])
    setThreadsOpen(false)
  }

  const addFiles = (files: FileList | null) => {
    if (!files) return
    setPending((p) => [...p, ...Array.from(files).map((f) => ({
      id: crypto.randomUUID(), name: f.name, size: f.size, kind: 'file' as const,
    }))])
  }

  const send = async () => {
    if (streaming) { abortRef.current?.abort(); return }
    if (!draft.trim() && !pending.length) return

    const model = AGENT_MODEL[agentId]
    const now = fmtTime()
    const userMsg: Message = {
      id: crypto.randomUUID(), role: 'user',
      text: draft.trim(), attachments: pending, time: now,
    }

    if (!model) {
      // Nyx / Hemera — reserved for other models, not connected yet
      const reply: Message = {
        id: crypto.randomUUID(), role: 'assistant',
        text: `${agent.name} is reserved for another model and isn't connected yet. Switch to Claude to chat.`,
        time: fmtTime(),
      }
      const next = [...messages, userMsg, reply]
      setMessages(next)
      saveHistory(convoId, next)
      setDraft('')
      setPending([])
      return
    }

    if (!apiKey) { setShowKeyPanel(true); return }

    const nextMsgs = [...messages, userMsg]
    setMessages(nextMsgs)
    saveHistory(convoId, nextMsgs)
    setDraft('')
    setPending([])

    const assistantId = crypto.randomUUID()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', text: '', time: fmtTime() }
    setMessages((m) => [...m, assistantMsg])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const history = nextMsgs
        .filter((m) => m.text.trim())
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text }))
      // First message must be role "user" — drop leading assistant greetings
      while (history.length && history[0].role !== 'user') history.shift()

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          ...authHeaders(apiKey),
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 16000,
          system: AGENT_SYSTEM[agentId] ?? '',
          stream: true,
          messages: history,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              accumulated += parsed.delta.text
              setMessages((m) => m.map((msg) =>
                msg.id === assistantId ? { ...msg, text: accumulated } : msg,
              ))
            }
          } catch { /* skip malformed */ }
        }
      }

      const final = [...nextMsgs, { ...assistantMsg, text: accumulated }]
      saveHistory(convoId, final)
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      const errText = (err as Error)?.message ?? 'Unknown error'
      setMessages((m) => m.map((msg) =>
        msg.id === assistantId ? { ...msg, text: `⚠ ${errText}` } : msg,
      ))
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div
      className="flex h-full"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
    >
      {/* Conversations (desktop rail) */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-line bg-panel/40 lg:flex">
        <div className="flex items-center justify-between border-b border-line p-3">
          <span className="label">Threads</span>
          <Plus size={14} className="text-dim hover:text-accent" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ThreadList convoId={convoId} onSelect={switchConvo} />
        </div>
        <button
          onClick={() => setShowKeyPanel((v) => !v)}
          className={cn(
            'flex items-center gap-2 border-t border-line px-3 py-2 text-[11px] transition-colors',
            apiKey ? 'text-dim hover:text-text' : 'text-amber/80 hover:text-amber',
          )}
        >
          <Key size={12} />
          {apiKey ? 'Claude connected' : 'Connect Claude'}
        </button>
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
            <span className="min-w-0 flex-1 truncate text-sm text-text">{convo.title}</span>
            <span className="text-[10px] text-dim">{convo.agent}</span>
            <ChevronDown size={15} className={cn('shrink-0 text-dim transition-transform', threadsOpen && 'rotate-180')} />
          </button>
          {threadsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setThreadsOpen(false)} />
              <div className="absolute inset-x-0 top-full z-40 max-h-[60vh] overflow-y-auto border-b border-line-2 bg-panel shadow-glow animate-fade-in">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <span className="label">Threads</span>
                  <Plus size={14} className="text-dim hover:text-accent" />
                </div>
                <ThreadList convoId={convoId} onSelect={switchConvo} />
              </div>
            </>
          )}
        </div>

        {/* Agent selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 sm:px-4">
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
          <span className="ml-auto hidden text-[10px] text-dim sm:inline">
            {AGENT_MODEL[agentId] ?? agent.model}
          </span>
          {!apiKey && (
            <button
              onClick={() => setShowKeyPanel(true)}
              className="flex items-center gap-1 border border-amber/40 bg-amber/10 px-2 py-1 text-[10px] text-amber/80 hover:bg-amber/20 lg:hidden"
            >
              <Key size={11} /> Set key
            </button>
          )}
        </div>

        {/* API Key panel */}
        {showKeyPanel && (
          <ApiKeyPanel
            value={apiKey}
            onChange={(k) => { setApiKey(k); localStorage.setItem('os:chat:apiKey', k) }}
            onClose={() => setShowKeyPanel(false)}
          />
        )}

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m) => (
            <MessageRow key={m.id} msg={m} agentColor={agent.color} agentName={agent.name} />
          ))}
          {streaming && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.text === '' && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center border text-[10px]" style={{ borderColor: `${agent.color}66`, color: agent.color }}>
                <Bot size={14} />
              </div>
              <div className="flex items-center gap-1 pt-2">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent/60" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
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
              placeholder={streaming ? 'Receiving…' : `Message ${agent.name}…`}
              className="max-h-32 min-h-[40px] flex-1 resize-none border border-line bg-bg/60 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent/60 focus:outline-none"
            />
            <button
              onClick={send}
              className={cn(
                'border p-2 transition-colors',
                streaming
                  ? 'border-danger/40 bg-danger/10 text-danger hover:bg-danger/20'
                  : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
              )}
              title={streaming ? 'Stop' : 'Send'}
            >
              {streaming ? <Square size={16} /> : <Send size={16} />}
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

function fmtTime() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function ApiKeyPanel({ value, onChange, onClose }: { value: string; onChange: (k: string) => void; onClose: () => void }) {
  const [show, setShow] = useState(false)
  const [local, setLocal] = useState(value)
  const [awaitingCode, setAwaitingCode] = useState(() => !!localStorage.getItem(OAUTH_VERIFIER_KEY))
  const [oauthCode, setOauthCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const signIn = async () => {
    setError('')
    const url = await buildOauthUrl()
    window.open(url, '_blank', 'noopener')
    setAwaitingCode(true)
  }

  const connect = async () => {
    if (!oauthCode.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const token = await exchangeOauthCode(oauthCode)
      onChange(token)
      onClose()
    } catch (err) {
      setError(`${(err as Error)?.message ?? 'Sign-in failed'} — you can paste a token manually below.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-b border-line bg-panel/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-dim">
          <Key size={12} /> Connect Claude
        </span>
        <button onClick={onClose} className="text-dim hover:text-text"><X size={13} /></button>
      </div>

      {/* OAuth sign-in (no token needed) */}
      <div className="mb-3 border border-line bg-bg/40 p-2">
        <button
          onClick={signIn}
          className="w-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs uppercase tracking-wider text-accent hover:bg-accent/20"
        >
          Sign in with Claude
        </button>
        {awaitingCode && (
          <div className="mt-2 flex gap-2">
            <input
              value={oauthCode}
              onChange={(e) => setOauthCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') connect() }}
              placeholder="Paste the code from the sign-in page"
              className="flex-1 border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
            />
            <button
              onClick={connect}
              disabled={busy}
              className="border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs uppercase tracking-wider text-accent hover:bg-accent/20 disabled:opacity-50"
            >
              {busy ? '…' : 'Connect'}
            </button>
          </div>
        )}
        <p className="mt-1.5 text-[10px] text-dim">
          Opens claude.ai sign-in. After approving, copy the code shown and paste it here.
        </p>
        {error && <p className="mt-1 text-[10px] text-danger">{error}</p>}
      </div>

      {/* Manual token / API key fallback */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="sk-ant-oat01-… (OAuth) or sk-ant-api…"
            className="w-full border border-line bg-bg/60 px-2 py-1.5 pr-8 text-sm text-text focus:border-accent/60 focus:outline-none"
          />
          <button
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-dim hover:text-text"
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <button
          onClick={() => { onChange(local); onClose() }}
          className="border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs uppercase tracking-wider text-accent hover:bg-accent/20"
        >
          Save
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-dim">
        Paste a Claude OAuth access token (<span className="text-text/60">sk-ant-oat01-…</span>) or an
        API key (<span className="text-text/60">sk-ant-api…</span>).
        Stored in localStorage only — only sent to api.anthropic.com.
      </p>
    </div>
  )
}

function ThreadList({ convoId, onSelect }: { convoId: string; onSelect: (id: string) => void }) {
  return (
    <>
      {CONVERSATIONS.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            'flex w-full flex-col gap-0.5 border-l-2 px-3 py-2.5 text-left transition-colors',
            c.id === convoId ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-panel-2/50',
          )}
        >
          <span className="flex items-center justify-between text-xs text-text">
            {c.title}
            <span className="text-[9px] text-dim">{c.agent}</span>
          </span>
        </button>
      ))}
    </>
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
