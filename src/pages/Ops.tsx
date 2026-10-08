import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Cpu, HardDrive, Monitor, Server, Smartphone, Terminal, Trash2, Wifi, WifiOff } from 'lucide-react'
import { isRealAgent, type Agent } from '@/data/agents'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { useOps, type OpsProblem, type OpsReport, type TailDevice } from '@/features/agentos/useOps'
import { clearErrors, dismissError, useAppErrors, type Severity } from '@/lib/errorBus'
import { Panel } from '@/components/ui/Panel'
import { StatusDot } from '@/components/ui/StatusDot'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/cn'

/**
 * Ops is the deliberate Command Deck exception (flat, sharp, dense) and it shows only what is real: this server and the
 * gateway on it (agent-os's /ops), the Tailscale devices that can reach it, the problems that actually happened (failed
 * tasks, blocked work, stopped flows, supervisor restarts, the gateway's error log), the real log files, the agents'
 * real usage, and BaseSpace's own errors. Anything that cannot be read says so instead of showing a placeholder.
 */

const STATE_COLOR = { up: '#46d369', down: '#ff5566', unconfigured: '#6b7785' } as const
const SEV_COLOR: Record<Severity, string> = { error: '#ff5566', warn: '#f0a020', info: '#6b7785' }
const DEVICE_ICON: Record<string, typeof Cpu> = { windows: Monitor, linux: Server, macOS: Monitor, iOS: Smartphone, android: Smartphone }

async function ping(url: string): Promise<number> {
  const t0 = performance.now()
  try {
    await fetch(url, { method: 'HEAD', cache: 'no-store', mode: 'no-cors', signal: AbortSignal.timeout(4000) })
    return Math.round(performance.now() - t0)
  } catch {
    return -1
  }
}

const fmtUptime = (sec: number) => {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
}
const fmtTokens = (n: number | null | undefined) => (n == null ? '—' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n))
const gb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`)
const pctColor = (p: number) => (p >= 90 ? '#ff5566' : p >= 75 ? '#f0a020' : '#46d369')

function Bar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px] text-dim">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(v)}%</span>
      </div>
      <div className="h-1 w-full bg-line">
        <div className="h-1" style={{ width: `${v}%`, background: pctColor(v) }} />
      </div>
    </div>
  )
}

function Stat({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="border border-line bg-panel/70 px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest text-dim">{label}</p>
      <div className="mt-1 flex items-baseline gap-2 font-display text-lg">{children}</div>
      {hint && <p className="mt-0.5 truncate text-[10px] text-dim">{hint}</p>}
    </div>
  )
}
const Num = ({ v, c }: { v: number | string; c: string }) => (
  <span className="tabular-nums" style={{ color: c }}>
    {v}
  </span>
)

function Row({ dot, name, detail, right }: { dot: string; name: string; detail?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border border-line bg-bg/30 px-2 py-1">
      <StatusDot color={dot} size={6} />
      <span className="w-36 shrink-0 truncate text-xs text-text">{name}</span>
      <span className="min-w-0 flex-1 truncate text-[10px] text-dim">{detail}</span>
      {right && <span className="shrink-0 text-[10px] tabular-nums text-dim">{right}</span>}
    </div>
  )
}

type LogTab = 'gateway' | 'supervisor' | 'errors'

export function Ops() {
  const { agents: allAgents, connection } = useAgentOsContext()
  const agents = connection === 'live' ? allAgents.filter(isRealAgent) : []
  const appErrors = useAppErrors()
  const { data, error, updatedAt } = useOps()
  const [online, setOnline] = useState(navigator.onLine)
  const [selfLatency, setSelfLatency] = useState<number | null>(null)
  const [logTab, setLogTab] = useState<LogTab>('gateway')
  const [logFilter, setLogFilter] = useState('')
  const [sev, setSev] = useState<Severity | 'all'>('all')
  const logRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

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

  const logLines = data ? (logTab === 'gateway' ? data.logs.gateway : logTab === 'supervisor' ? data.logs.supervisor : data.logs.gatewayErrors) : []
  const shownLines = logFilter ? logLines.filter((l) => l.toLowerCase().includes(logFilter.toLowerCase())) : logLines
  useEffect(() => {
    const el = logRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [shownLines.length, logTab, updatedAt])

  // Problems: the machine's real ones, then BaseSpace's own errors.
  const problems = useMemo(() => {
    const own: OpsProblem[] = appErrors.map((e) => ({
      id: `bs:${e.id}`,
      kind: 'log',
      severity: e.severity,
      when: e.lastSeen,
      source: `BaseSpace · ${e.source}`,
      text: e.count > 1 ? `${e.message} (×${e.count})` : e.message,
    }))
    return [...(data?.problems ?? []), ...own]
      .filter((p) => sev === 'all' || p.severity === sev)
      .sort((a, b) => Date.parse(b.when) - Date.parse(a.when))
  }, [data?.problems, appErrors, sev])
  const counts = (s: Severity) => (data?.problems ?? []).filter((p) => p.severity === s).length + appErrors.filter((e) => e.severity === s).length

  const services = data?.services ?? []
  const connectors = data?.connectors ?? []
  const svcUp = services.filter((s) => s.state === 'up').length + connectors.filter((c) => c.enabled && c.status === 'connected').length
  const svcTotal = services.filter((s) => s.state !== 'unconfigured').length + connectors.filter((c) => c.enabled).length
  const ts = data?.tailscale
  const devices: TailDevice[] = ts && !('error' in ts) ? [ts.self, ...ts.peers] : []
  const maxUse = Math.max(1, ...agents.map((a) => a.live?.tokens ?? a.live?.turns ?? 0))

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg tracking-wider text-crimson-3">OPS CONSOLE</h1>
        <span className={cn('flex items-center gap-1 text-[10px] uppercase tracking-wider', online ? 'text-neon-green' : 'text-danger')}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          {online ? 'online' : 'offline'}
        </span>
        {selfLatency !== null && online && <span className="text-[10px] tabular-nums text-dim">this page {selfLatency >= 0 ? `${selfLatency}ms` : '—'}</span>}
        <span className="text-[10px] uppercase tracking-wider text-dim">
          agent-os: <span className={connection === 'live' ? 'text-neon-green' : connection === 'error' ? 'text-danger' : 'text-amber'}>{connection}</span>
        </span>
        {updatedAt && <span className="text-[10px] text-dim">updated {relTime(new Date(updatedAt))}</span>}
      </div>

      {error && !data && <p className="border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">The gateway's Ops report could not be read: {error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Services" hint={data ? 'gateway, memory, connectors' : undefined}>
          <Num v={svcUp} c="#46d369" />
          <span className="text-sm text-dim">/ {svcTotal}</span>
        </Stat>
        <Stat label="Devices" hint={ts && 'error' in ts ? 'Tailscale unavailable' : 'on your tailnet'}>
          <Num v={devices.filter((d) => d.online).length} c="#46d369" />
          <span className="text-sm text-dim">/ {devices.length}</span>
        </Stat>
        <Stat label="Problems" hint="last 48 hours">
          <Num v={counts('error')} c={SEV_COLOR.error} />
          <Num v={counts('warn')} c={SEV_COLOR.warn} />
          <Num v={counts('info')} c={SEV_COLOR.info} />
        </Stat>
        <Stat label="BaseSpace errors" hint={`${appErrors.reduce((n, e) => n + e.count, 0)} in total`}>
          <Num v={appErrors.length} c={appErrors.length ? '#ff5566' : '#46d369'} />
        </Stat>
        <Stat label="Agents" hint={agents.filter((a) => a.control?.paused).length ? `${agents.filter((a) => a.control?.paused).length} paused` : undefined}>
          <Num v={agents.filter((a) => a.status === 'working' || a.status === 'thinking').length} c="#46d369" />
          <Num v={agents.filter((a) => a.status === 'idle').length} c="#6b7785" />
        </Stat>
        <Stat label="Data" hint={data?.gateway.dataDir}>
          <Num v={data ? gb(data.host.dataMB ?? 0) : '—'} c="#f0a020" />
        </Stat>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-3">
        {/* Services, devices, this machine */}
        <div className="flex flex-col gap-3 lg:min-h-0">
          <Panel title="Services" code="HEALTH" accent="#e05c67" className="rounded-none" bodyClassName="space-y-1 p-1.5">
            {services.length === 0 && <p className="p-1 text-xs text-dim">{error ? 'Not reachable.' : 'Loading…'}</p>}
            {services.map((s) => (
              <Row
                key={s.id}
                dot={STATE_COLOR[s.state]}
                name={s.name}
                detail={s.state === 'unconfigured' ? s.detail : s.id === 'gateway' && data ? `up ${fmtUptime(data.gateway.uptimeSec)} · ${data.gateway.memoryMB} MB · ${data.gateway.node}` : s.detail}
                right={s.ms != null ? `${s.ms}ms` : undefined}
              />
            ))}
            {connectors.map((c) => (
              <Row
                key={c.name}
                dot={!c.enabled ? '#6b7785' : c.status === 'connected' ? '#46d369' : '#ff5566'}
                name={c.name.replace(/^claude\.ai\s+/i, '')}
                detail={`${c.kind === 'account' ? 'account connector' : 'local server'} · ${c.enabled ? 'on' : 'off'} · ${c.status}`}
              />
            ))}
          </Panel>

          <Panel title="Devices" code="TAILSCALE" accent="#46d369" className="rounded-none" bodyClassName="space-y-1 p-1.5">
            {ts && 'error' in ts && <p className="p-1 text-xs text-dim">{ts.error}</p>}
            {!ts && <p className="p-1 text-xs text-dim">{error ? 'Not reachable.' : 'Loading…'}</p>}
            {devices.map((d) => {
              const Icon = DEVICE_ICON[d.os] ?? Cpu
              return (
                <div key={`${d.name}-${d.ip}`} className="flex items-center gap-2 border border-line bg-bg/30 px-2 py-1">
                  <Icon size={13} className={d.online ? 'text-neon-green' : 'text-dim'} />
                  <span className="w-28 shrink-0 truncate text-xs text-text">
                    {d.name}
                    {d.self && <span className="ml-1 text-[9px] text-accent">this server</span>}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[10px] text-dim">
                    {d.os}
                    {!d.online && d.lastSeen ? ` · last seen ${relTime(new Date(d.lastSeen))}` : d.online ? ' · online' : ' · offline'}
                  </span>
                  <span className="text-[10px] tabular-nums text-dim">{d.ip}</span>
                </div>
              )
            })}
          </Panel>

          <Panel title="This machine" code="HOST" accent="#9b7bff" className="rounded-none" bodyClassName="space-y-2.5 p-3">
            {!data ? (
              <p className="text-xs text-dim">{error ? 'Not reachable.' : 'Loading…'}</p>
            ) : (
              <>
                <p className="flex items-center gap-1.5 text-xs text-text">
                  <HardDrive size={12} className="text-dim" /> {data.host.name} <span className="text-dim">· up {fmtUptime(data.host.uptimeSec)}</span>
                </p>
                {data.host.cpuPercent != null && <Bar value={data.host.cpuPercent} label={`CPU · ${data.host.cpus} cores`} />}
                <Bar value={((data.host.memTotalMB - data.host.memFreeMB) / data.host.memTotalMB) * 100} label={`Memory · ${gb(data.host.memTotalMB - data.host.memFreeMB)} of ${gb(data.host.memTotalMB)}`} />
                {data.host.disk && <Bar value={((data.host.disk.totalGB - data.host.disk.freeGB) / data.host.disk.totalGB) * 100} label={`Disk (data drive) · ${data.host.disk.freeGB} GB free of ${data.host.disk.totalGB} GB`} />}
                <p className="truncate text-[10px] text-dim" title={data.host.cpuModel}>
                  {data.host.cpuModel} · {data.gateway.platform} · terminal {data.gateway.terminal ? 'on' : 'off'}
                </p>
              </>
            )}
          </Panel>
        </div>

        {/* Logs */}
        <Panel
          title="Logs"
          code="FILES"
          accent="#f0a020"
          className="min-h-[360px] rounded-none lg:min-h-0"
          bodyClassName="flex min-h-0 flex-col p-0"
          right={
            <button
              onClick={() => void navigator.clipboard?.writeText(shownLines.join('\n'))}
              title="Copy what is shown"
              className="text-dim hover:text-text"
            >
              <Copy size={13} />
            </button>
          }
        >
          <div className="flex items-center gap-1.5 border-b border-line px-2 py-1 text-[10px] text-dim">
            <Terminal size={11} />
            {(['gateway', 'supervisor', 'errors'] as LogTab[]).map((t) => (
              <button key={t} onClick={() => setLogTab(t)} className={cn('px-1.5 py-0.5 uppercase tracking-wider', logTab === t ? 'bg-panel-2 text-text' : 'hover:text-text')}>
                {t}
              </button>
            ))}
            <input
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              placeholder="filter"
              className="ml-auto w-24 border border-line bg-bg px-1 py-0.5 text-[10px] text-text placeholder:text-dim focus:outline-none"
            />
          </div>
          <div
            ref={logRef}
            onScroll={(e) => {
              const el = e.currentTarget
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
            }}
            className="min-h-0 flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed"
          >
            {!data ? (
              <p className="text-dim">{error ? 'Not reachable.' : 'Loading…'}</p>
            ) : !data.logs.dir ? (
              <p className="text-dim">The gateway cannot find its log directory (set AGENT_OS_LOG_DIR), so there is nothing to show.</p>
            ) : shownLines.length === 0 ? (
              <p className="text-dim">{logTab === 'errors' ? 'The error log is empty. Good.' : 'Nothing in this log.'}</p>
            ) : (
              shownLines.map((l, i) => (
                <div key={i} className={cn('whitespace-pre-wrap break-words', /error|fail|exited|refused|ECONN/i.test(l) ? 'text-danger/90' : 'text-text/80')}>
                  {l}
                </div>
              ))
            )}
          </div>
          {data?.logs.dir && <p className="border-t border-line px-2 py-1 text-[10px] text-dim">last lines of the real files in {data.logs.dir}, refreshed every 10 s</p>}
        </Panel>

        {/* Problems and agents */}
        <div className="flex flex-col gap-3 lg:min-h-0">
          <Panel
            title="Problems"
            code="REAL"
            accent="#ff5566"
            className="rounded-none"
            bodyClassName="p-0"
            right={
              appErrors.length > 0 ? (
                <button onClick={() => clearErrors()} title="Clear BaseSpace's own errors" className="text-dim hover:text-text">
                  <Trash2 size={13} />
                </button>
              ) : undefined
            }
          >
            <div className="flex gap-1 border-b border-line px-2 py-1 text-[10px]">
              {(['all', 'error', 'warn', 'info'] as const).map((s) => (
                <button key={s} onClick={() => setSev(s)} className={cn('px-1.5 py-0.5 uppercase tracking-wider', sev === s ? 'bg-panel-2 text-text' : 'text-dim hover:text-text')}>
                  {s}
                </button>
              ))}
            </div>
            <div className="max-h-[340px] divide-y divide-line/60 overflow-y-auto">
              {problems.length === 0 && <p className="p-3 text-xs text-dim">Nothing has gone wrong in the last 48 hours.</p>}
              {problems.map((p) => (
                <div key={p.id} className="px-3 py-2" style={{ borderLeft: `2px solid ${SEV_COLOR[p.severity]}` }}>
                  <p className="flex items-center gap-2 text-[10px] uppercase tracking-wider" style={{ color: SEV_COLOR[p.severity] }}>
                    {p.severity} <span className="text-dim normal-case tracking-normal">· {p.source} · {relTime(new Date(p.when))}</span>
                    {p.id.startsWith('bs:') && (
                      <button onClick={() => dismissError(p.id.slice(3))} className="ml-auto text-dim hover:text-text normal-case tracking-normal">
                        dismiss
                      </button>
                    )}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-text/90">{p.text}</p>
                  {p.flowId && (
                    <Link to={`/workbench?panel=flow&flow=${encodeURIComponent(p.flowId)}`} className="text-[10px] text-accent hover:underline">
                      open the flow →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Agents" code="USAGE" accent="#9b7bff" className="rounded-none" bodyClassName="p-1.5">
            {agents.length === 0 && <p className="p-1 text-xs text-dim">{connection === 'live' ? 'No agents.' : 'The gateway is not connected, so there is nothing real to show.'}</p>}
            <div className="space-y-1">
              {agents.map((a) => (
                <AgentRow key={a.id} a={a} max={maxUse} />
              ))}
            </div>
            <p className="px-1 pt-1.5 text-[10px] text-dim">Tokens (or model turns when a model does not report tokens) used so far, and the share of tasks that succeeded.</p>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function AgentRow({ a, max }: { a: Agent; max: number }) {
  const use = a.live?.tokens ?? a.live?.turns ?? 0
  const last = a.live?.lastTurnAt ? relTime(new Date(a.live.lastTurnAt)) : 'no turns yet'
  return (
    <div className="border border-line bg-bg/30 px-2 py-1.5">
      <div className="flex items-center gap-2 text-xs">
        <StatusDot color={a.control?.paused ? '#f0a020' : a.status === 'offline' ? '#ff5566' : a.status === 'idle' ? '#6b7785' : '#46d369'} size={6} />
        <span className="w-20 shrink-0 truncate text-text">{a.name}</span>
        <div className="h-1 min-w-0 flex-1 bg-line">
          <div className="h-1" style={{ width: `${Math.max(2, (use / max) * 100)}%`, background: a.color }} />
        </div>
        <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-dim">{fmtTokens(a.live?.tokens ?? null)}</span>
        <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-dim">{a.live?.successRate == null ? '—' : `${Math.round(a.live.successRate * 100)}%`}</span>
      </div>
      <p className="mt-0.5 pl-4 text-[10px] text-dim">
        {a.control?.paused ? 'paused · ' : ''}
        {a.model} · last turn {last}
      </p>
    </div>
  )
}

export type { OpsReport }
