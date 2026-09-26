import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Bug,
  Copy,
  Cpu,
  HardDrive,
  Maximize2,
  Pause,
  Play,
  Radio,
  Server,
  Smartphone,
  Terminal,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { DEVICES, OPS_ERRORS, SERVICES, makeLogLine, type DeviceConn, type ServiceStatus } from '@/data/ops'
import type { Agent } from '@/data/agents'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { clearErrors, dismissError, useAppErrors, type Severity } from '@/lib/errorBus'
import { Panel } from '@/components/ui/Panel'
import { Modal } from '@/components/ui/Modal'
import { StatusDot } from '@/components/ui/StatusDot'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/cn'

/**
 * Ops is the deliberate Command Deck exception (design territories,
 * page-specific patterns): flat, sharp, dense. Everything is layered —
 * a summary strip, panels, a full-table pop-up per panel, and a detail
 * pop-up per row with related errors, log lines and raw data — because
 * this page is for debugging.
 */

const STATE_COLOR = { up: '#46d369', degraded: '#f0a020', down: '#ff5566' } as const
const SEV_COLOR: Record<Severity, string> = { error: '#ff5566', warn: '#f0a020', info: '#6b7785' }
const DEVICE_ICON: Record<string, typeof Cpu> = {
  mobile: Smartphone,
  server: Server,
  workstation: Cpu,
  storage: HardDrive,
  sensor: Radio,
}

interface LogLine {
  time: string
  source: string
  text: string
}

/** One error shape for both the monitored-services feed and failures
 *  captured inside BaseSpace itself. */
interface Issue {
  id: string
  severity: Severity
  source: string
  message: string
  context?: string
  stack?: string
  when: string
  count: number
  firstSeen?: string
  origin: 'services' | 'basespace'
}

type Detail =
  | { kind: 'service'; item: ServiceStatus }
  | { kind: 'device'; item: DeviceConn }
  | { kind: 'issue'; item: Issue }
  | { kind: 'agent'; item: Agent }
  | { kind: 'log'; index: number }
  | { kind: 'table'; panel: 'services' | 'devices' | 'issues' | 'agents' }

async function ping(url: string): Promise<number> {
  const t0 = performance.now()
  try {
    await fetch(url, { method: 'HEAD', cache: 'no-store', mode: 'no-cors', signal: AbortSignal.timeout(4000) })
    return Math.round(performance.now() - t0)
  } catch {
    return -1
  }
}

/** "12.4M" → 12_400_000 (for comparing agents' token usage). */
function tokenCount(s: string): number {
  const m = /([\d.]+)\s*([KMB])?/i.exec(s)
  if (!m) return 0
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] ?? '').toUpperCase() as 'K' | 'M' | 'B'] ?? 1
  return Number(m[1]) * mult
}

const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`)

export function Ops() {
  const { agents, connection, events } = useAgentOsContext()
  const appErrors = useAppErrors()
  const [logs, setLogs] = useState<LogLine[]>(() => Array.from({ length: 16 }, (_, i) => makeLogLine(i)))
  const [paused, setPaused] = useState(false)
  const [logFilter, setLogFilter] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const [selfLatency, setSelfLatency] = useState<number | null>(null)
  const [sevFilter, setSevFilter] = useState<Severity | 'all'>('all')
  const [detail, setDetail] = useState<Detail | null>(null)
  const seed = useRef(16)
  const logScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => {
      seed.current += 1
      setLogs((l) => [...l.slice(-300), makeLogLine(seed.current)])
    }, 1400)
    return () => window.clearInterval(id)
  }, [paused])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    const measure = async () => setSelfLatency(await ping(window.location.origin + '/'))
    void measure()
    const id = window.setInterval(measure, 15000)
    return () => window.clearInterval(id)
  }, [])

  // Real Agent-OS events join the stream when a gateway is connected.
  const allLogs = useMemo<LogLine[]>(() => {
    const evs = events.map((e) => ({
      time: new Date(e.time).toTimeString().slice(0, 8),
      source: String(e.payload.agentId ?? 'agent-os'),
      text: e.type,
    }))
    return [...logs, ...evs].sort((a, b) => a.time.localeCompare(b.time))
  }, [logs, events])
  const shownLogs = logFilter ? allLogs.filter((l) => l.source === logFilter) : allLogs
  const logSources = useMemo(() => [...new Set(allLogs.map((l) => l.source))].sort(), [allLogs])

  useEffect(() => {
    const el = logScrollRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) el.scrollTop = el.scrollHeight
  }, [shownLogs.length])

  const issues = useMemo<Issue[]>(
    () => [
      ...appErrors.map((e) => ({
        id: e.id,
        severity: e.severity,
        source: e.source,
        message: e.message,
        context: e.context,
        stack: e.stack,
        when: relTime(new Date(e.lastSeen)),
        count: e.count,
        firstSeen: e.firstSeen,
        origin: 'basespace' as const,
      })),
      ...OPS_ERRORS.map((e) => ({ ...e, when: e.ago, count: 1, origin: 'services' as const })),
    ],
    [appErrors],
  )
  const shownIssues = sevFilter === 'all' ? issues : issues.filter((i) => i.severity === sevFilter)

  const count = <T,>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length
  const maxTokens = Math.max(1, ...agents.map((a) => tokenCount(a.stats.tokens)))

  const related = (source: string) => ({
    issues: issues.filter((i) => i.source.toLowerCase().includes(source.toLowerCase()) || source.toLowerCase().includes(i.source.toLowerCase())),
    logs: allLogs.filter((l) => l.source.toLowerCase() === source.toLowerCase()).slice(-12),
  })

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg tracking-wider text-crimson-3">OPS CONSOLE</h1>
        <span className={cn('flex items-center gap-1 text-[10px] uppercase tracking-wider', online ? 'text-neon-green' : 'text-danger')}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          {online ? 'online' : 'offline'}
        </span>
        {selfLatency !== null && online && (
          <span className="text-[10px] tabular-nums text-dim">self {selfLatency >= 0 ? `${selfLatency}ms` : '—'}</span>
        )}
        <span className="text-[10px] uppercase tracking-wider text-dim">
          agent-os:{' '}
          <span className={connection === 'live' ? 'text-neon-green' : connection === 'error' ? 'text-danger' : 'text-amber'}>{connection}</span>
        </span>
      </div>

      {/* Summary strip — every tile opens its panel as a full table */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Services" onClick={() => setDetail({ kind: 'table', panel: 'services' })}>
          <Num v={count(SERVICES, (s) => s.state === 'up')} c={STATE_COLOR.up} />
          <Num v={count(SERVICES, (s) => s.state === 'degraded')} c={STATE_COLOR.degraded} />
          <Num v={count(SERVICES, (s) => s.state === 'down')} c={STATE_COLOR.down} />
        </Stat>
        <Stat label="Devices" onClick={() => setDetail({ kind: 'table', panel: 'devices' })}>
          <Num v={count(DEVICES, (d) => d.online)} c="#46d369" />
          <Num v={count(DEVICES, (d) => !d.online)} c="#ff5566" />
        </Stat>
        <Stat label="Issues" onClick={() => setDetail({ kind: 'table', panel: 'issues' })}>
          <Num v={count(issues, (i) => i.severity === 'error')} c={SEV_COLOR.error} />
          <Num v={count(issues, (i) => i.severity === 'warn')} c={SEV_COLOR.warn} />
          <Num v={count(issues, (i) => i.severity === 'info')} c={SEV_COLOR.info} />
        </Stat>
        <Stat label="BaseSpace failures" onClick={() => setDetail({ kind: 'table', panel: 'issues' })}>
          <Num v={appErrors.length} c={appErrors.length ? '#ff5566' : '#46d369'} />
          <span className="text-[10px] text-dim">{appErrors.reduce((n, e) => n + e.count, 0)} total</span>
        </Stat>
        <Stat label="Agents" onClick={() => setDetail({ kind: 'table', panel: 'agents' })}>
          <Num v={count(agents, (a) => a.status === 'working' || a.status === 'thinking')} c="#46d369" />
          <Num v={count(agents, (a) => a.status === 'idle')} c="#6b7785" />
          <Num v={count(agents, (a) => a.status === 'offline')} c="#ff5566" />
        </Stat>
        <Stat label="Log lines">
          <Num v={allLogs.length} c="#f0a020" />
          <span className="text-[10px] text-dim">{logSources.length} sources</span>
        </Stat>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Services + devices */}
        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="Services" code="HEALTH" accent="#e05c67" className="rounded-none" bodyClassName="p-1.5" right={<Expand onClick={() => setDetail({ kind: 'table', panel: 'services' })} />}>
            <div className="space-y-1">
              {SERVICES.map((s) => (
                <ServiceRow key={s.id} svc={s} issues={related(s.name).issues.length} onClick={() => setDetail({ kind: 'service', item: s })} />
              ))}
            </div>
          </Panel>
          <Panel title="Devices" code="CONN" accent="#46d369" className="rounded-none" bodyClassName="p-1.5" right={<Expand onClick={() => setDetail({ kind: 'table', panel: 'devices' })} />}>
            <div className="space-y-1">
              {DEVICES.map((d) => {
                const Icon = DEVICE_ICON[d.kind] ?? Cpu
                return (
                  <button
                    key={d.id}
                    onClick={() => setDetail({ kind: 'device', item: d })}
                    className="flex w-full items-center gap-2 border border-line bg-bg/30 px-2 py-1 text-left transition-colors hover:border-line-2"
                  >
                    <Icon size={13} className={d.online ? 'text-neon-green' : 'text-danger'} />
                    <span className="w-24 truncate text-xs text-text">{d.name}</span>
                    <span className="min-w-0 flex-1 truncate text-[10px] text-dim">{d.detail}</span>
                    <span className="text-[10px] tabular-nums text-dim">{d.ip}</span>
                  </button>
                )
              })}
            </div>
          </Panel>
        </div>

        {/* Log stream */}
        <Panel
          title="Live Log"
          code="STREAM"
          accent="#f0a020"
          className="min-h-[360px] rounded-none lg:min-h-0"
          bodyClassName="flex min-h-0 flex-col p-0"
          right={
            <button onClick={() => setPaused((p) => !p)} title={paused ? 'Resume' : 'Pause'} className="text-dim hover:text-text">
              {paused ? <Play size={13} /> : <Pause size={13} />}
            </button>
          }
        >
          <div className="flex items-center gap-1.5 border-b border-line px-2 py-1 text-[10px] text-dim">
            <Terminal size={11} /> tail -f /var/log/basespace
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="ml-auto border border-line bg-bg px-1 py-0.5 text-[10px] text-text focus:outline-none"
            >
              <option value="">all sources</option>
              {logSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div ref={logScrollRef} className="min-h-0 flex-1 overflow-y-auto p-1.5 text-[11px] leading-relaxed">
            {shownLogs.map((l, i) => (
              <button
                key={i}
                onClick={() => setDetail({ kind: 'log', index: allLogs.indexOf(l) })}
                className="flex w-full gap-2 whitespace-nowrap px-1 text-left hover:bg-panel-2/60"
              >
                <span className="tabular-nums text-dim">{l.time}</span>
                <span className="text-accent">[{l.source}]</span>
                <span className="truncate text-text/80">{l.text}</span>
              </button>
            ))}
          </div>
        </Panel>

        {/* Issues + agents */}
        <div className="flex min-h-0 flex-col gap-3">
          <Panel
            title="Errors & Warnings"
            code="ALERT"
            accent="#ff5566"
            className="rounded-none"
            bodyClassName="p-1.5"
            right={<Expand onClick={() => setDetail({ kind: 'table', panel: 'issues' })} />}
          >
            <div className="mb-1.5 flex flex-wrap gap-1 text-[10px]">
              {(['all', 'error', 'warn', 'info'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSevFilter(s)}
                  className={cn('border px-1.5 py-0.5 uppercase tracking-wider', sevFilter === s ? 'border-line-2 text-text' : 'border-line text-dim hover:text-text')}
                  style={s !== 'all' && sevFilter === s ? { color: SEV_COLOR[s], borderColor: `${SEV_COLOR[s]}88` } : undefined}
                >
                  {s} {s === 'all' ? issues.length : count(issues, (i) => i.severity === s)}
                </button>
              ))}
            </div>
            <div className="max-h-[340px] space-y-1 overflow-y-auto">
              {shownIssues.map((e) => (
                <IssueRow key={e.id} issue={e} onClick={() => setDetail({ kind: 'issue', item: e })} />
              ))}
              {!shownIssues.length && <div className="p-2 text-[11px] text-dim">Nothing here.</div>}
            </div>
          </Panel>

          <Panel title="Agent Health" code="AGT" accent="#e0408a" className="rounded-none" bodyClassName="p-1.5" right={<Expand onClick={() => setDetail({ kind: 'table', panel: 'agents' })} />}>
            <div className="mb-1 flex gap-2 px-2 text-[9px] uppercase tracking-wider text-dim">
              <span className="w-20">agent</span>
              <span className="flex-1">token usage (share)</span>
              <span className="w-12 text-right">tokens</span>
              <span className="w-12 text-right" title="Task success rate — live from Agent-OS">success</span>
            </div>
            <div className="space-y-1">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setDetail({ kind: 'agent', item: a })}
                  className="flex w-full items-center gap-2 border border-line bg-bg/30 px-2 py-1 text-left transition-colors hover:border-line-2"
                >
                  <StatusDot color={a.status === 'offline' ? '#ff5566' : a.color} pulse={a.status === 'working'} size={6} />
                  <span className="w-[68px] truncate text-xs text-text">{a.name}</span>
                  <div className="h-1.5 flex-1 bg-bg">
                    <div className="h-full" style={{ width: `${(tokenCount(a.stats.tokens) / maxTokens) * 100}%`, backgroundColor: a.color }} />
                  </div>
                  <span className="w-12 text-right text-[10px] tabular-nums text-dim">{a.stats.tokens}</span>
                  <span className="w-12 text-right text-[10px] tabular-nums text-dim">{pct(a.live?.successRate)}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 px-1 text-[10px] leading-snug text-dim">
              Bar = share of total tokens used. Success rate and turn latency come from Agent-OS when it's connected ({connection}).
            </p>
          </Panel>
        </div>
      </div>

      {detail && (
        <DetailModal
          detail={detail}
          onClose={() => setDetail(null)}
          open={setDetail}
          issues={issues}
          agents={agents}
          logs={allLogs}
          related={related}
          maxTokens={maxTokens}
        />
      )}
    </div>
  )
}

// ---- small pieces -----------------------------------------------------------

function Stat({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="border border-line bg-panel/50 px-2.5 py-1.5 text-left transition-colors hover:border-line-2 disabled:hover:border-line">
      <div className="text-[9px] uppercase tracking-wider text-dim">{label}</div>
      <div className="flex items-baseline gap-2">{children}</div>
    </button>
  )
}

function Num({ v, c }: { v: number; c: string }) {
  return (
    <span className="font-display text-lg tabular-nums" style={{ color: v ? c : '#3a4048' }}>
      {v}
    </span>
  )
}

function Expand({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Open full view" className="text-dim hover:text-text">
      <Maximize2 size={12} />
    </button>
  )
}

function Spark({ svc, h = 16 }: { svc: ServiceStatus; h?: number }) {
  const color = STATE_COLOR[svc.state]
  const max = Math.max(...svc.spark)
  return (
    <svg viewBox={`0 0 64 ${h + 2}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        points={svc.spark.map((v, i) => `${(i / (svc.spark.length - 1)) * 64},${h + 1 - (v / max) * h}`).join(' ')}
      />
    </svg>
  )
}

function ServiceRow({ svc, issues, onClick }: { svc: ServiceStatus; issues: number; onClick: () => void }) {
  const color = STATE_COLOR[svc.state]
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 border border-line bg-bg/30 px-2 py-1 text-left transition-colors hover:border-line-2">
      <StatusDot color={color} pulse={svc.state !== 'down'} size={6} />
      <span className="w-24 truncate text-xs text-text">{svc.name}</span>
      <div className="min-w-0 flex-1">
        <Spark svc={svc} h={14} />
      </div>
      <span className="w-10 text-right text-[10px] tabular-nums text-dim">{svc.errorRate}</span>
      <span className="w-12 text-right text-[10px] tabular-nums" style={{ color }}>
        {svc.state === 'down' ? '—' : `${svc.latency}ms`}
      </span>
      {issues > 0 && <span className="text-[10px] text-danger">⚠{issues}</span>}
    </button>
  )
}

function IssueRow({ issue: e, onClick }: { issue: Issue; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full border-l-2 bg-bg/30 px-2 py-1 text-left transition-colors hover:bg-bg/50" style={{ borderColor: SEV_COLOR[e.severity] }}>
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="flex items-center gap-1 uppercase tracking-wider" style={{ color: SEV_COLOR[e.severity] }}>
          {e.origin === 'basespace' ? <Bug size={10} /> : <AlertTriangle size={10} />} {e.severity} · {e.source}
        </span>
        {e.count > 1 && <span className="bg-panel-2 px-1 text-text/80">×{e.count}</span>}
        <span className="ml-auto text-dim">{e.when}</span>
      </div>
      <div className="truncate text-xs text-text/85">{e.message}</div>
    </button>
  )
}

function KV({ k, v, c }: { k: string; v: ReactNode; c?: string }) {
  return (
    <div className="border border-line bg-bg/30 px-2 py-1">
      <div className="text-[9px] uppercase tracking-wider text-dim">{k}</div>
      <div className="truncate text-xs tabular-nums text-text" style={c ? { color: c } : undefined}>
        {v}
      </div>
    </div>
  )
}

function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center text-[10px] uppercase tracking-wider text-dim">
        {title}
        <span className="ml-auto">{right}</span>
      </div>
      {children}
    </div>
  )
}

function Raw({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2)
  return (
    <details className="mt-3 border border-line bg-bg/40">
      <summary className="cursor-pointer px-2 py-1 text-[10px] uppercase tracking-wider text-dim">Raw data</summary>
      <div className="relative">
        <button onClick={() => void navigator.clipboard?.writeText(text)} className="absolute right-2 top-1 text-dim hover:text-text" title="Copy">
          <Copy size={12} />
        </button>
        <pre className="max-h-64 overflow-auto p-2 text-[10px] leading-relaxed text-text/80">{text}</pre>
      </div>
    </details>
  )
}

// ---- detail pop-ups -----------------------------------------------------------

function DetailModal({
  detail,
  onClose,
  open,
  issues,
  agents,
  logs,
  related,
  maxTokens,
}: {
  detail: Detail
  onClose: () => void
  open: (d: Detail) => void
  issues: Issue[]
  agents: Agent[]
  logs: LogLine[]
  related: (source: string) => { issues: Issue[]; logs: LogLine[] }
  maxTokens: number
}) {
  const [pingResult, setPingResult] = useState<string | null>(null)

  const RelatedBlock = ({ source }: { source: string }) => {
    const r = related(source)
    return (
      <>
        <Section title={`Related issues (${r.issues.length})`}>
          <div className="space-y-1">
            {r.issues.map((i) => (
              <IssueRow key={i.id} issue={i} onClick={() => open({ kind: 'issue', item: i })} />
            ))}
            {!r.issues.length && <div className="text-[11px] text-dim">None.</div>}
          </div>
        </Section>
        <Section title={`Recent log lines (${r.logs.length})`}>
          <div className="max-h-40 overflow-y-auto border border-line bg-bg/40 p-1.5 text-[11px]">
            {r.logs.map((l, i) => (
              <div key={i} className="flex gap-2 whitespace-nowrap">
                <span className="tabular-nums text-dim">{l.time}</span>
                <span className="truncate text-text/80">{l.text}</span>
              </div>
            ))}
            {!r.logs.length && <div className="text-dim">No lines from this source yet.</div>}
          </div>
        </Section>
      </>
    )
  }

  let title = ''
  let accent = '#e05c67'
  let body: ReactNode = null

  switch (detail.kind) {
    case 'service': {
      const s = detail.item
      title = s.name
      accent = STATE_COLOR[s.state]
      body = (
        <>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <KV k="state" v={s.state} c={STATE_COLOR[s.state]} />
            <KV k="latency" v={s.state === 'down' ? '—' : `${s.latency}ms`} />
            <KV k="uptime" v={s.uptime} />
            <KV k="error rate" v={s.errorRate} />
          </div>
          <Section title="Latency trend">
            <div className="border border-line bg-bg/40 p-2">
              <Spark svc={s} h={60} />
            </div>
          </Section>
          <Section
            title="Endpoint"
            right={
              <span className="flex gap-2">
                <button
                  onClick={async () => {
                    setPingResult('pinging…')
                    const ms = await ping(`http://${s.endpoint}`)
                    setPingResult(ms >= 0 ? `reachable in ${ms}ms` : 'unreachable from this browser')
                  }}
                  className="text-accent hover:underline"
                >
                  ping now
                </button>
                <button onClick={() => void navigator.clipboard?.writeText(s.endpoint)} className="hover:text-text">
                  copy
                </button>
              </span>
            }
          >
            <div className="border border-line bg-bg/40 px-2 py-1 text-xs text-text">
              {s.endpoint}
              {pingResult && <span className="ml-2 text-dim">· {pingResult}</span>}
            </div>
          </Section>
          <RelatedBlock source={s.name} />
          <Raw value={s} />
        </>
      )
      break
    }
    case 'device': {
      const d = detail.item
      title = d.name
      accent = d.online ? '#46d369' : '#ff5566'
      body = (
        <>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <KV k="status" v={d.online ? 'online' : 'offline'} c={accent} />
            <KV k="kind" v={d.kind} />
            <KV k="ip" v={d.ip} />
            <KV k="last seen" v={d.lastSeen} />
          </div>
          <Section title="Detail">
            <div className="border border-line bg-bg/40 px-2 py-1 text-xs text-text/85">{d.detail}</div>
          </Section>
          <RelatedBlock source={d.name} />
          <Raw value={d} />
        </>
      )
      break
    }
    case 'issue': {
      const e = detail.item
      title = `${e.severity} · ${e.source}`
      accent = SEV_COLOR[e.severity]
      body = (
        <>
          <div className="border-l-2 bg-bg/40 px-2 py-1.5 text-sm text-text" style={{ borderColor: accent }}>
            {e.message}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <KV k="origin" v={e.origin === 'basespace' ? 'inside BaseSpace' : 'monitored service'} />
            <KV k="occurrences" v={e.count} />
            <KV k="last seen" v={e.when} />
            <KV k="first seen" v={e.firstSeen ? relTime(new Date(e.firstSeen)) : '—'} />
          </div>
          {e.context && (
            <Section title="Context">
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap border border-line bg-bg/40 p-2 text-[11px] text-text/80">{e.context}</pre>
            </Section>
          )}
          {e.stack && (
            <Section title="Stack trace">
              <pre className="max-h-56 overflow-auto border border-line bg-bg/40 p-2 text-[10px] leading-relaxed text-text/70">{e.stack}</pre>
            </Section>
          )}
          <div className="mt-3 flex gap-3 text-[11px]">
            <button
              onClick={() => void navigator.clipboard?.writeText(JSON.stringify(e, null, 2))}
              className="flex items-center gap-1 text-dim hover:text-text"
            >
              <Copy size={12} /> Copy details
            </button>
            {e.origin === 'basespace' && (
              <button
                onClick={() => {
                  dismissError(e.id)
                  onClose()
                }}
                className="flex items-center gap-1 text-dim hover:text-danger"
              >
                <Trash2 size={12} /> Dismiss
              </button>
            )}
          </div>
          <RelatedBlock source={e.source} />
        </>
      )
      break
    }
    case 'agent': {
      const a = detail.item
      title = a.name
      accent = a.color
      body = (
        <>
          <div className="text-xs text-dim">
            {a.role} · {a.model}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <KV k="status" v={a.status} c={a.status === 'offline' ? '#ff5566' : a.color} />
            <KV k="tokens used" v={a.stats.tokens} />
            <KV k="token share" v={`${Math.round((tokenCount(a.stats.tokens) / maxTokens) * 100)}% of top`} />
            <KV k="uptime" v={a.stats.uptime} />
            <KV k="tasks done" v={a.live?.tasks ?? a.stats.tasksDone} />
            <KV k="success rate" v={pct(a.live?.successRate)} c="#46d369" />
            <KV k="failure rate" v={pct(a.live?.failureRate)} c="#ff5566" />
            <KV k="avg turn" v={a.live?.avgTurnMs != null ? `${Math.round(a.live.avgTurnMs)}ms` : '—'} />
          </div>
          {!a.live && (
            <p className="mt-1.5 text-[10px] text-dim">Success rate and turn latency appear when an Agent-OS gateway is connected; token and uptime figures are from the local roster.</p>
          )}
          <Section title="Current task">
            <div className="border border-line bg-bg/40 px-2 py-1 text-xs text-text/85">{a.task || '—'}</div>
          </Section>
          <RelatedBlock source={a.id} />
          <Raw value={a} />
        </>
      )
      break
    }
    case 'log': {
      const i = detail.index
      const line = logs[i]
      title = line ? `[${line.source}] ${line.time}` : 'Log'
      accent = '#f0a020'
      body = line && (
        <>
          <div className="border border-line bg-bg/40 px-2 py-1.5 text-sm text-text">{line.text}</div>
          <Section title="Surrounding lines">
            <div className="max-h-64 overflow-y-auto border border-line bg-bg/40 p-1.5 text-[11px]">
              {logs.slice(Math.max(0, i - 8), i + 9).map((l, j) => (
                <div key={j} className={cn('flex gap-2 whitespace-nowrap px-1', l === line && 'bg-amber/15')}>
                  <span className="tabular-nums text-dim">{l.time}</span>
                  <span className="text-accent">[{l.source}]</span>
                  <span className="text-text/80">{l.text}</span>
                </div>
              ))}
            </div>
          </Section>
          <RelatedBlock source={line.source} />
        </>
      )
      break
    }
    case 'table': {
      accent = '#e05c67'
      const th = 'border-b border-line px-2 py-1 text-left text-[9px] font-normal uppercase tracking-wider text-dim'
      const td = 'border-b border-line/60 px-2 py-1 text-[11px] tabular-nums text-text/85'
      if (detail.panel === 'services') {
        title = 'All services'
        body = (
          <table className="w-full">
            <thead>
              <tr>{['service', 'state', 'latency', 'uptime', 'errors', 'endpoint', 'issues'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {SERVICES.map((s) => (
                <tr key={s.id} onClick={() => open({ kind: 'service', item: s })} className="cursor-pointer hover:bg-panel-2/60">
                  <td className={td}>{s.name}</td>
                  <td className={td} style={{ color: STATE_COLOR[s.state] }}>{s.state}</td>
                  <td className={td}>{s.state === 'down' ? '—' : `${s.latency}ms`}</td>
                  <td className={td}>{s.uptime}</td>
                  <td className={td}>{s.errorRate}</td>
                  <td className={td}>{s.endpoint}</td>
                  <td className={td}>{related(s.name).issues.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      } else if (detail.panel === 'devices') {
        title = 'All devices'
        body = (
          <table className="w-full">
            <thead>
              <tr>{['device', 'kind', 'status', 'ip', 'last seen', 'detail'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {DEVICES.map((d) => (
                <tr key={d.id} onClick={() => open({ kind: 'device', item: d })} className="cursor-pointer hover:bg-panel-2/60">
                  <td className={td}>{d.name}</td>
                  <td className={td}>{d.kind}</td>
                  <td className={td} style={{ color: d.online ? '#46d369' : '#ff5566' }}>{d.online ? 'online' : 'offline'}</td>
                  <td className={td}>{d.ip}</td>
                  <td className={td}>{d.lastSeen}</td>
                  <td className={td}>{d.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      } else if (detail.panel === 'issues') {
        title = 'All issues'
        body = (
          <>
            <div className="mb-2 flex justify-end">
              <button onClick={clearErrors} className="flex items-center gap-1 text-[11px] text-dim hover:text-danger">
                <Trash2 size={12} /> Clear BaseSpace failures
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr>{['severity', 'origin', 'source', 'message', 'count', 'last seen'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {issues.map((e) => (
                  <tr key={e.id} onClick={() => open({ kind: 'issue', item: e })} className="cursor-pointer hover:bg-panel-2/60">
                    <td className={td} style={{ color: SEV_COLOR[e.severity] }}>{e.severity}</td>
                    <td className={td}>{e.origin === 'basespace' ? 'BaseSpace' : 'service'}</td>
                    <td className={td}>{e.source}</td>
                    <td className={cn(td, 'max-w-[320px] truncate')}>{e.message}</td>
                    <td className={td}>{e.count}</td>
                    <td className={td}>{e.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )
      } else {
        title = 'All agents'
        body = (
          <table className="w-full">
            <thead>
              <tr>{['agent', 'status', 'model', 'tokens', 'tasks', 'success', 'avg turn', 'uptime'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} onClick={() => open({ kind: 'agent', item: a })} className="cursor-pointer hover:bg-panel-2/60">
                  <td className={td} style={{ color: a.color }}>{a.name}</td>
                  <td className={td}>{a.status}</td>
                  <td className={td}>{a.model}</td>
                  <td className={td}>{a.stats.tokens}</td>
                  <td className={td}>{a.live?.tasks ?? a.stats.tasksDone}</td>
                  <td className={td}>{pct(a.live?.successRate)}</td>
                  <td className={td}>{a.live?.avgTurnMs != null ? `${Math.round(a.live.avgTurnMs)}ms` : '—'}</td>
                  <td className={td}>{a.stats.uptime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
      break
    }
  }

  return (
    <Modal open onClose={onClose} title={title} code="OPS" accent={accent} width={detail.kind === 'table' ? 900 : 680}>
      {body}
    </Modal>
  )
}
