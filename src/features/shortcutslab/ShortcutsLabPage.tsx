import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Copy, Play, Plus, Radio, Smartphone, X, Zap } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { clock } from '@/lib/time'
import { cn } from '@/lib/cn'

interface ShortcutsLabPageProps {
  open: boolean
  onClose: () => void
}

type Method = 'GET' | 'POST'
type ActionId = 'note' | 'queue-track' | 'ask' | 'status'
type Source = 'run' | 'simulate' | 'builder'

interface ShortcutDef {
  id: ActionId
  name: string
  method: Method
  /** Builds a representative incoming payload for the "Run" / "Simulate" path. */
  sample: () => Record<string, unknown> | null
}

const BASE_URL = 'http://localhost:7842/trigger'

const METHOD_COLOR: Record<Method, string> = {
  GET: '#46d369',
  POST: '#36e0c8',
}

const SOURCE_LABEL: Record<Source, string> = {
  run: 'manual run',
  simulate: 'simulated webhook',
  builder: 'action builder',
}

const SHORTCUTS: ShortcutDef[] = [
  {
    id: 'note',
    name: 'Quick Note to Vault',
    method: 'POST',
    sample: () => ({
      text: 'Master the new ISΛRK single before Friday',
      tags: ['vault', 'mobile'],
    }),
  },
  {
    id: 'queue-track',
    name: 'Queue a Track',
    method: 'POST',
    sample: () => ({
      trackId: 'isark-042',
      title: 'Nightdrive (WIP)',
      position: 'next',
    }),
  },
  {
    id: 'ask',
    name: 'Ask Agent',
    method: 'POST',
    sample: () => ({ prompt: "Summarise today's calendar" }),
  },
  {
    id: 'status',
    name: 'Status Check',
    method: 'GET',
    sample: () => null,
  },
]

const METHOD_FOR: Record<ActionId, Method> = {
  note: 'POST',
  'queue-track': 'POST',
  ask: 'POST',
  status: 'GET',
}

interface LogEntry {
  id: number
  action: ActionId
  method: Method
  source: Source
  at: Date
  request: Record<string, unknown> | null
  response: Record<string, unknown>
}

let entrySeq = 0

/**
 * Builds a plausible mock response for an incoming webhook. `queueLen` is
 * threaded through so the queue counter climbs across repeated triggers.
 */
function buildResponse(
  action: ActionId,
  request: Record<string, unknown> | null,
  queueLen: number,
): Record<string, unknown> {
  const savedAt = new Date().toISOString()
  switch (action) {
    case 'note':
      return {
        ok: true,
        noteId: `n_${Math.random().toString(36).slice(2, 8)}`,
        vault: 'Personal OS',
        chars: String(request?.text ?? '').length,
        savedAt,
      }
    case 'queue-track':
      return {
        ok: true,
        queued: request?.title ?? 'Untitled',
        position: request?.position ?? 'end',
        queueLength: queueLen,
      }
    case 'ask':
      return {
        ok: true,
        answer: '3 events today — next up "Mix review" at 15:00.',
        agent: 'os-bridge',
        tookMs: Math.floor(Math.random() * 700 + 120),
      }
    case 'status':
      return {
        ok: true,
        bridge: 'online',
        services: { notes: 'up', queue: 'up', agent: 'up' },
        battery: Math.floor(Math.random() * 40 + 55),
        uptime: '4d 02h',
      }
  }
}

export function ShortcutsLabPage({ open, onClose }: ShortcutsLabPageProps) {
  const [log, setLog] = useState<LogEntry[]>([])
  const [lastTriggered, setLastTriggered] = useState<Partial<Record<ActionId, Date>>>({})
  const [copied, setCopied] = useState(false)
  const queueLen = useRef(0)

  // Esc closes the overlay.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const fire = (
    action: ActionId,
    method: Method,
    request: Record<string, unknown> | null,
    source: Source,
  ) => {
    if (action === 'queue-track') queueLen.current += 1
    const response = buildResponse(action, request, queueLen.current)
    const at = new Date()
    const entry: LogEntry = { id: entrySeq++, action, method, source, at, request, response }
    setLog((prev) => [entry, ...prev].slice(0, 8))
    setLastTriggered((prev) => ({ ...prev, [action]: at }))
  }

  const runShortcut = (s: ShortcutDef) => fire(s.id, s.method, s.sample(), 'run')

  const simulate = () => {
    const s = SHORTCUTS[Math.floor(Math.random() * SHORTCUTS.length)]
    fire(s.id, s.method, s.sample(), 'simulate')
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(`${BASE_URL}/{action}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg font-mono text-text">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-line bg-panel/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Smartphone size={18} className="text-accent" />
          <h1 className="font-display text-lg uppercase tracking-wider text-text">iOS Shortcuts Lab</h1>
          <span
            className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: '#36e0c8', borderColor: '#36e0c855', backgroundColor: '#36e0c811' }}
          >
            <StatusDot color="#36e0c8" size={6} pulse /> local bridge
          </span>
        </div>
        <button onClick={onClose} className="text-dim transition-colors hover:text-text">
          <X size={18} />
        </button>
      </header>

      {/* Webhook endpoint bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel/30 px-4 py-2.5">
        <span className="text-[10px] uppercase tracking-widest text-dim">endpoint</span>
        <code className="min-w-0 flex-1 truncate text-xs text-accent">
          {BASE_URL}/<span className="text-amber">{'{action}'}</span>
        </code>
        <button
          onClick={copyUrl}
          className="flex items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim transition-colors hover:border-accent/60 hover:text-accent"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={simulate}
          className="flex items-center gap-1 border border-accent/50 bg-accent/10 px-2 py-1 text-[10px] uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
        >
          <Radio size={11} /> Simulate
        </button>
      </div>

      {/* Body: library · inspector · builder */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ShortcutLibrary lastTriggered={lastTriggered} onRun={runShortcut} />
        <PayloadInspector log={log} />
        <ActionBuilder onFire={(action, request) => fire(action, METHOD_FOR[action], request, 'builder')} />
      </div>
    </div>
  )
}

/* ── Left panel: shortcut library ─────────────────────────────────────── */

function ShortcutLibrary({
  lastTriggered,
  onRun,
}: {
  lastTriggered: Partial<Record<ActionId, Date>>
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
                <span className="truncate text-xs text-text">{s.name}</span>
                <MethodBadge method={s.method} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-dim">
                  {last ? `last · ${clock(last)}` : 'never triggered'}
                </span>
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

function PayloadInspector({ log }: { log: LogEntry[] }) {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-[10px] uppercase tracking-widest text-dim">Payload Inspector</span>
        <span className="text-[10px] text-dim">{log.length}/8 requests</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {log.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-dim">
            <Zap size={22} className="opacity-50" />
            <p className="text-xs">No requests yet.</p>
            <p className="text-[10px]">Run a shortcut, hit Simulate, or fire a custom payload.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {log.map((e) => (
              <RequestCard key={e.id} entry={e} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function RequestCard({ entry }: { entry: LogEntry }) {
  return (
    <div className="border border-line bg-panel/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-2.5 py-1.5">
        <MethodBadge method={entry.method} />
        <code className="text-xs text-accent">/trigger/{entry.action}</code>
        <span className="ml-auto text-[10px] text-dim">{SOURCE_LABEL[entry.source]}</span>
        <span className="text-[10px] text-dim">{clock(entry.at)}</span>
      </div>
      <div className="grid gap-px bg-line md:grid-cols-2">
        <div className="bg-bg/60 p-2.5">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-dim">
            {entry.request ? 'request' : 'request · no body (GET)'}
          </div>
          <JsonBlock value={entry.request ?? {}} />
        </div>
        <div className="bg-bg/60 p-2.5">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-dim">response</div>
          <JsonBlock value={entry.response} />
        </div>
      </div>
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
          <p className="text-[10px] leading-relaxed text-dim">
            GET request — no body. Fire to hit the status endpoint.
          </p>
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

function MethodBadge({ method }: { method: Method }) {
  const color = METHOD_COLOR[method]
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
        ? '#46d369' // strings → green
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
    <pre className={cn('overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-dim')}>
      {out}
    </pre>
  )
}
