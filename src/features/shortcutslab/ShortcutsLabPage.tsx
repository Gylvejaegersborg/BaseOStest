import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Play,
  Plus,
  Radio,
  Smartphone,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { clock } from '@/lib/time'
import { cn } from '@/lib/cn'

interface ShortcutsLabPageProps {
  open: boolean
  onClose: () => void
}

type Method = 'GET' | 'POST'
type ActionId = 'note' | 'queue-track' | 'ask' | 'status'
type Source = 'run' | 'simulate' | 'builder' | 'phone'
type ConnStatus = 'offline' | 'connecting' | 'connected' | 'error'

interface ShortcutDef {
  id: ActionId
  name: string
  method: Method
  /** Builds a representative payload for the "Run" / "Simulate" path. */
  sample: () => Record<string, unknown> | null
}

const MAX_LOG = 12
const LS_URL = 'shortcutslab.bridgeUrl'
const LS_TOKEN = 'shortcutslab.token'

const METHOD_COLOR: Record<string, string> = {
  GET: '#46d369',
  POST: '#36e0c8',
}

const SOURCE_LABEL: Record<Source, string> = {
  run: 'manual run',
  simulate: 'simulated webhook',
  builder: 'action builder',
  phone: 'from phone',
}

const SHORTCUTS: ShortcutDef[] = [
  {
    id: 'note',
    name: 'Quick Note to Vault',
    method: 'POST',
    sample: () => ({ text: 'Master the new ISΛRK single before Friday', tags: ['vault', 'mobile'] }),
  },
  {
    id: 'queue-track',
    name: 'Queue a Track',
    method: 'POST',
    sample: () => ({ trackId: 'isark-042', title: 'Nightdrive (WIP)', position: 'next' }),
  },
  {
    id: 'ask',
    name: 'Ask Agent',
    method: 'POST',
    sample: () => ({ prompt: "Summarise today's calendar" }),
  },
  { id: 'status', name: 'Status Check', method: 'GET', sample: () => null },
]

const METHOD_FOR: Record<ActionId, Method> = {
  note: 'POST',
  'queue-track': 'POST',
  ask: 'POST',
  status: 'GET',
}

interface LogEntry {
  id: string
  action: string
  method: string
  source: Source
  at: Date
  request: Record<string, unknown> | null
  response: Record<string, unknown>
  ip?: string
}

let seq = 0
const genId = () =>
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `local_${++seq}`

/** Mock responses for the offline path (mirrors the bridge's buildResponse). */
function buildResponse(
  action: string,
  request: Record<string, unknown> | null,
  queueLen: number,
): Record<string, unknown> {
  switch (action) {
    case 'note':
      return {
        ok: true,
        noteId: `n_${Math.random().toString(36).slice(2, 8)}`,
        vault: 'Personal OS',
        chars: String(request?.text ?? '').length,
        savedAt: new Date().toISOString(),
      }
    case 'queue-track':
      return { ok: true, queued: request?.title ?? 'Untitled', position: request?.position ?? 'end', queueLength: queueLen }
    case 'ask':
      return { ok: true, answer: '3 events today — next up "Mix review" at 15:00.', agent: 'os-bridge', tookMs: Math.floor(Math.random() * 700 + 120) }
    case 'status':
      return { ok: true, bridge: 'offline-mock', services: { notes: 'up', queue: 'up', agent: 'up' }, battery: Math.floor(Math.random() * 40 + 55), uptime: '4d 02h' }
    default:
      return { ok: true, action, received: true }
  }
}

export function ShortcutsLabPage({ open, onClose }: ShortcutsLabPageProps) {
  const [log, setLog] = useState<LogEntry[]>([])
  const [lastTriggered, setLastTriggered] = useState<Record<string, Date>>({})
  const queueLen = useRef(0)

  // Bridge connection state.
  const [bridgeUrl, setBridgeUrl] = useState(() => localStorage.getItem(LS_URL) ?? '')
  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN) ?? '')
  const [status, setStatus] = useState<ConnStatus>('offline')
  const esRef = useRef<EventSource | null>(null)

  const base = bridgeUrl.replace(/\/+$/, '')

  const addEntry = useCallback((entry: LogEntry) => {
    setLog((prev) => [entry, ...prev].slice(0, MAX_LOG))
    setLastTriggered((prev) => ({ ...prev, [entry.action]: entry.at }))
  }, [])

  const disconnect = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    setStatus('offline')
  }, [])

  const connect = useCallback(() => {
    if (!base) return
    esRef.current?.close()
    localStorage.setItem(LS_URL, base)
    localStorage.setItem(LS_TOKEN, token)
    setStatus('connecting')
    const es = new EventSource(`${base}/events?token=${encodeURIComponent(token)}`)
    esRef.current = es
    es.onopen = () => setStatus('connected')
    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data)
        addEntry({
          id: d.id ?? genId(),
          action: d.action,
          method: d.method ?? 'POST',
          source: (d.source as Source) ?? 'phone',
          at: d.at ? new Date(d.at) : new Date(),
          request: d.request ?? null,
          response: d.response ?? {},
          ip: d.ip,
        })
      } catch {
        /* ignore malformed frames */
      }
    }
    es.onerror = () => setStatus('error')
  }, [base, token, addEntry])

  // Tear down the stream when the overlay unmounts.
  useEffect(() => () => esRef.current?.close(), [])

  // Esc closes the overlay.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /**
   * Fire an action. When connected we POST to the real bridge and let the SSE
   * stream echo it back into the log; offline we synthesise a mock response so
   * the lab still works as a demo.
   */
  const trigger = useCallback(
    async (action: ActionId, method: Method, request: Record<string, unknown> | null, source: Source) => {
      if (status === 'connected' && base) {
        try {
          await fetch(`${base}/trigger/${action}?token=${encodeURIComponent(token)}&source=${source}`, {
            method,
            headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined,
            body: method === 'POST' && request ? JSON.stringify(request) : undefined,
          })
          return // SSE will deliver the entry
        } catch {
          /* fall through to offline mock */
        }
      }
      if (action === 'queue-track') queueLen.current += 1
      addEntry({
        id: genId(),
        action,
        method,
        source,
        at: new Date(),
        request,
        response: buildResponse(action, request, queueLen.current),
      })
    },
    [status, base, token, addEntry],
  )

  const simulate = () => {
    const s = SHORTCUTS[Math.floor(Math.random() * SHORTCUTS.length)]
    void trigger(s.id, s.method, s.sample(), 'simulate')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg font-mono text-text">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-line bg-panel/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Smartphone size={18} className="text-accent" />
          <h1 className="font-display text-lg uppercase tracking-wider text-text">iOS Shortcuts Lab</h1>
          <ConnPill status={status} />
        </div>
        <button onClick={onClose} className="text-dim transition-colors hover:text-text">
          <X size={18} />
        </button>
      </header>

      <ConnectBar
        bridgeUrl={bridgeUrl}
        token={token}
        status={status}
        onUrl={setBridgeUrl}
        onToken={setToken}
        onConnect={connect}
        onDisconnect={disconnect}
        onSimulate={simulate}
      />

      {/* Body: library · inspector · builder */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ShortcutLibrary
          lastTriggered={lastTriggered}
          onRun={(s) => void trigger(s.id, s.method, s.sample(), 'run')}
        />
        <PayloadInspector log={log} onClear={() => setLog([])} />
        <ActionBuilder onFire={(action, request) => void trigger(action, METHOD_FOR[action], request, 'builder')} />
      </div>
    </div>
  )
}

/* ── Connection status pill ───────────────────────────────────────────── */

function ConnPill({ status }: { status: ConnStatus }) {
  const map: Record<ConnStatus, { color: string; label: string }> = {
    offline: { color: '#6b7785', label: 'offline' },
    connecting: { color: '#f0a020', label: 'connecting…' },
    connected: { color: '#46d369', label: 'live · connected' },
    error: { color: '#ff5566', label: 'disconnected' },
  }
  const { color, label } = map[status]
  return (
    <span
      className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}11` }}
    >
      <StatusDot color={color} size={6} pulse={status === 'connected' || status === 'connecting'} /> {label}
    </span>
  )
}

/* ── Connect bar ──────────────────────────────────────────────────────── */

function ConnectBar({
  bridgeUrl,
  token,
  status,
  onUrl,
  onToken,
  onConnect,
  onDisconnect,
  onSimulate,
}: {
  bridgeUrl: string
  token: string
  status: ConnStatus
  onUrl: (v: string) => void
  onToken: (v: string) => void
  onConnect: () => void
  onDisconnect: () => void
  onSimulate: () => void
}) {
  const [copied, setCopied] = useState(false)
  const connected = status === 'connected'
  const base = bridgeUrl.replace(/\/+$/, '') || 'https://your-bridge.example'

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(`${base}/trigger/note?token=${token || 'YOUR_TOKEN'}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-line bg-panel/30 px-4 py-2.5">
      {/* Row 1 — connect controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-dim">bridge</span>
        <input
          value={bridgeUrl}
          onChange={(e) => onUrl(e.target.value)}
          placeholder="https://your-tunnel.trycloudflare.com"
          className="min-w-[200px] flex-1 border border-line bg-bg px-2 py-1.5 text-xs text-text placeholder:text-dim focus:border-accent/60 focus:outline-none"
        />
        <input
          value={token}
          onChange={(e) => onToken(e.target.value)}
          type="password"
          placeholder="token"
          className="w-28 border border-line bg-bg px-2 py-1.5 text-xs text-text placeholder:text-dim focus:border-accent/60 focus:outline-none"
        />
        {connected || status === 'connecting' ? (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 border border-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-dim transition-colors hover:border-danger/60 hover:text-danger"
          >
            <WifiOff size={13} /> Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center gap-1.5 border border-accent/50 bg-accent/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
          >
            <Wifi size={13} /> Connect
          </button>
        )}
      </div>

      {/* Row 2 — endpoint + simulate */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-dim">endpoint</span>
        <code className="min-w-0 flex-1 truncate text-xs text-accent">
          {base}/trigger/<span className="text-amber">{'{action}'}</span>
        </code>
        <button
          onClick={copyEndpoint}
          className="flex items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim transition-colors hover:border-accent/60 hover:text-accent"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={onSimulate}
          className="flex items-center gap-1 border border-accent/50 bg-accent/10 px-2 py-1 text-[10px] uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
        >
          <Radio size={11} /> Simulate
        </button>
      </div>
    </div>
  )
}

/* ── Left panel: shortcut library ─────────────────────────────────────── */

function ShortcutLibrary({
  lastTriggered,
  onRun,
}: {
  lastTriggered: Record<string, Date>
  onRun: (s: ShortcutDef) => void
}) {
  return (
    <aside className="shrink-0 overflow-y-auto border-b border-line bg-panel/30 lg:w-[260px] lg:border-b-0 lg:border-r">
      <div className="border-b border-line px-3 py-2 text-[10px] uppercase tracking-widest text-dim">
        Shortcut Library
      </div>
      <div className="flex flex-col">
        {SHORTCUTS.map((s) => {
          const last = lastTriggered[s.id]
          return (
            <div key={s.id} className="flex flex-col gap-2 border-b border-line px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-text">{s.name}</span>
                <MethodBadge method={s.method} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-dim">{last ? `last · ${clock(last)}` : 'never triggered'}</span>
                <button
                  onClick={() => onRun(s)}
                  className="flex items-center gap-1 border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-dim transition-colors hover:border-accent/60 hover:text-accent"
                >
                  <Play size={10} /> Run
                </button>
              </div>
              <code className="truncate text-[10px] text-dim">
                {s.method} /trigger/{s.id}
              </code>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

/* ── Main panel: payload inspector ────────────────────────────────────── */

function PayloadInspector({ log, onClear }: { log: LogEntry[]; onClear: () => void }) {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-[10px] uppercase tracking-widest text-dim">Payload Inspector</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-dim">
            {log.length}/{MAX_LOG} requests
          </span>
          {log.length > 0 && (
            <button onClick={onClear} className="text-[10px] uppercase tracking-wider text-dim hover:text-danger">
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {log.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-dim">
            <Zap size={22} className="opacity-50" />
            <p className="text-sm">No requests yet.</p>
            <p className="text-xs">Connect your bridge, then trigger a Shortcut — or hit Simulate.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {log.map((e, i) => (
              <RequestCard key={e.id} entry={e} newest={i === 0} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function RequestCard({ entry, newest }: { entry: LogEntry; newest: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  const fromPhone = entry.source === 'phone'

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ request: entry.request, response: entry.response }, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={cn(
        'border bg-panel/40',
        newest ? 'border-accent/40' : 'border-line',
      )}
      style={newest ? { boxShadow: 'inset 2px 0 0 #36e0c8' } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-2.5 py-2">
        <button onClick={() => setExpanded((v) => !v)} className="text-dim transition-colors hover:text-text">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <MethodBadge method={entry.method} />
        <code className="text-sm text-accent">/trigger/{entry.action}</code>
        <span
          className="border px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
          style={
            fromPhone
              ? { color: '#e0408a', borderColor: '#e0408a55', backgroundColor: '#e0408a11' }
              : { color: '#6b7785', borderColor: '#6b778555' }
          }
        >
          {SOURCE_LABEL[entry.source]}
        </span>
        <span className="ml-auto text-[11px] text-dim">{clock(entry.at)}</span>
        <button onClick={copyJson} className="text-dim transition-colors hover:text-accent" title="Copy JSON">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      {expanded && (
        <div className="grid gap-px bg-line md:grid-cols-2">
          <div className="bg-bg/60 p-3">
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-dim">
              {entry.request ? 'request' : 'request · no body (GET)'}
            </div>
            <JsonBlock value={entry.request ?? {}} />
          </div>
          <div className="bg-bg/60 p-3">
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-dim">response</div>
            <JsonBlock value={entry.response} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Right panel: action builder ──────────────────────────────────────── */

interface ParamRow {
  key: string
  value: string
}

function ActionBuilder({
  onFire,
}: {
  onFire: (action: ActionId, request: Record<string, unknown> | null) => void
}) {
  const [action, setAction] = useState<ActionId>('note')
  const [params, setParams] = useState<ParamRow[]>([
    { key: 'text', value: '' },
    { key: '', value: '' },
    { key: '', value: '' },
  ])

  const setRow = (i: number, patch: Partial<ParamRow>) =>
    setParams((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const fire = () => {
    if (METHOD_FOR[action] === 'GET') {
      onFire(action, null)
      return
    }
    const request: Record<string, unknown> = {}
    for (const { key, value } of params) {
      const k = key.trim()
      if (k) request[k] = coerce(value)
    }
    onFire(action, request)
  }

  const isGet = METHOD_FOR[action] === 'GET'

  return (
    <aside className="shrink-0 overflow-y-auto border-t border-line bg-panel/30 lg:w-[240px] lg:border-l lg:border-t-0">
      <div className="border-b border-line px-3 py-2 text-[10px] uppercase tracking-widest text-dim">
        Action Builder
      </div>
      <div className="flex flex-col gap-3 p-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-dim">Action</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as ActionId)}
            className="border border-line bg-bg px-2 py-1.5 text-xs text-text focus:border-accent/60 focus:outline-none"
          >
            <option value="note">note</option>
            <option value="queue-track">queue-track</option>
            <option value="ask">ask</option>
            <option value="status">status</option>
          </select>
        </label>

        <div className="flex items-center gap-2">
          <MethodBadge method={METHOD_FOR[action]} />
          <code className="truncate text-[10px] text-dim">/trigger/{action}</code>
        </div>

        {isGet ? (
          <p className="text-[10px] leading-relaxed text-dim">GET request — no body. Fire to hit the status endpoint.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider text-dim">Params</span>
            {params.map((row, i) => (
              <div key={i} className="flex gap-1">
                <input
                  value={row.key}
                  onChange={(e) => setRow(i, { key: e.target.value })}
                  placeholder="key"
                  className="w-0 min-w-0 flex-1 border border-line bg-bg px-1.5 py-1 text-[11px] text-accent placeholder:text-dim focus:border-accent/60 focus:outline-none"
                />
                <input
                  value={row.value}
                  onChange={(e) => setRow(i, { value: e.target.value })}
                  placeholder="value"
                  className="w-0 min-w-0 flex-1 border border-line bg-bg px-1.5 py-1 text-[11px] text-text placeholder:text-dim focus:border-accent/60 focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={fire}
          className="flex items-center justify-center gap-1.5 border border-accent/50 bg-accent/10 py-1.5 text-[11px] uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
        >
          <Plus size={12} /> Fire
        </button>
      </div>
    </aside>
  )
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function MethodBadge({ method }: { method: string }) {
  const color = METHOD_COLOR[method] ?? '#6b7785'
  return (
    <span
      className="shrink-0 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}11` }}
    >
      {method}
    </span>
  )
}

/** Loosely coerce a string field into number / boolean / null where it reads as one. */
function coerce(v: string): unknown {
  const t = v.trim()
  if (t === '') return ''
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  return v
}

const JSON_TOKEN =
  /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g

/** Renders pretty-printed JSON with colored spans — no external highlighter. */
function JsonBlock({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2)
  const out: ReactNode[] = []
  const re = new RegExp(JSON_TOKEN)
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const [full, keyTok, strTok, numTok] = m
    const color = keyTok
      ? '#36e0c8' // keys → accent
      : strTok
        ? '#5fe08a' // strings → green
        : numTok
          ? '#f0a020' // numbers → amber
          : '#e0408a' // booleans / null → magenta
    out.push(
      <span key={key++} style={{ color }}>
        {full}
      </span>,
    )
    last = m.index + full.length
  }
  if (last < text.length) out.push(text.slice(last))
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[13px] leading-6 text-text/90">
      {out}
    </pre>
  )
}
