import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Cpu, HardDrive, Smartphone, Server, Radio, Terminal } from 'lucide-react'
import { DEVICES, OPS_ERRORS, SERVICES, makeLogLine, type OpsError, type ServiceStatus } from '@/data/ops'
import { AGENTS } from '@/data/agents'
import { Panel } from '@/components/ui/Panel'
import { StatusDot } from '@/components/ui/StatusDot'

const STATE_COLOR = { up: '#46d369', degraded: '#f0a020', down: '#ff5566' } as const
const SEV_COLOR: Record<OpsError['severity'], string> = { error: '#ff5566', warn: '#f0a020', info: '#6b7785' }
const DEVICE_ICON: Record<string, typeof Cpu> = {
  mobile: Smartphone,
  server: Server,
  workstation: Cpu,
  storage: HardDrive,
  sensor: Radio,
}

export function Ops() {
  const [logs, setLogs] = useState(() => Array.from({ length: 12 }, (_, i) => makeLogLine(i)))
  const seed = useRef(12)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => {
      seed.current += 1
      setLogs((l) => [...l.slice(-60), makeLogLine(seed.current)])
    }, 1400)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-4 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <h1 className="mb-3 font-display text-2xl tracking-wider text-text">OPS CONSOLE</h1>

        <Panel title="Services" code="HEALTH" accent="#36e0c8" className="mb-3" bodyClassName="p-2">
          <div className="space-y-1.5">
            {SERVICES.map((s) => (
              <ServiceRow key={s.id} svc={s} />
            ))}
          </div>
        </Panel>

        <Panel title="Devices" code="CONN" accent="#46d369" bodyClassName="p-2">
          <div className="space-y-1.5">
            {DEVICES.map((d) => {
              const Icon = DEVICE_ICON[d.kind] ?? Cpu
              return (
                <div key={d.id} className="flex items-center gap-2 border border-line bg-bg/30 px-2 py-1.5">
                  <Icon size={14} className={d.online ? 'text-neon-green' : 'text-danger'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-text">
                      {d.name}
                      <StatusDot color={d.online ? '#46d369' : '#ff5566'} pulse={d.online} size={5} />
                    </div>
                    <div className="truncate text-[10px] text-dim">{d.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Log stream */}
      <div className="lg:col-span-1">
        <Panel title="Live Log" code="STREAM" accent="#f0a020" className="h-full" bodyClassName="p-0">
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-1.5 text-[10px] text-dim">
            <Terminal size={11} /> tail -f /var/log/personal-os
          </div>
          <div className="h-[calc(100%-30px)] overflow-y-auto p-2 text-[11px] leading-relaxed">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2 whitespace-nowrap">
                <span className="text-dim tabular-nums">{l.time}</span>
                <span className="text-accent">[{l.source}]</span>
                <span className="text-text/80">{l.text}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </Panel>
      </div>

      {/* Errors + agent health */}
      <div className="lg:col-span-1">
        <Panel title="Errors & Warnings" code="ALERT" accent="#ff5566" className="mb-3" bodyClassName="p-2">
          <div className="space-y-1.5">
            {OPS_ERRORS.map((e) => (
              <div key={e.id} className="border-l-2 bg-bg/30 px-2 py-1.5" style={{ borderColor: SEV_COLOR[e.severity] }}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 uppercase tracking-wider" style={{ color: SEV_COLOR[e.severity] }}>
                    <AlertTriangle size={10} /> {e.severity} · {e.source}
                  </span>
                  <span className="text-dim">{e.ago}</span>
                </div>
                <div className="text-xs text-text/85">{e.message}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Agent Health" code="AGT" accent="#e0408a" bodyClassName="p-2">
          <div className="space-y-1.5">
            {AGENTS.map((a) => (
              <div key={a.id} className="flex items-center gap-2 border border-line bg-bg/30 px-2 py-1.5">
                <StatusDot color={a.status === 'offline' ? '#ff5566' : a.color} pulse={a.status === 'working'} size={6} />
                <span className="w-20 truncate text-xs text-text">{a.name}</span>
                <div className="h-1.5 flex-1 bg-bg">
                  <div className="h-full" style={{ width: `${a.stats.load * 100}%`, backgroundColor: a.color }} />
                </div>
                <span className="w-10 text-right text-[10px] tabular-nums text-dim">{Math.round(a.stats.load * 100)}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function ServiceRow({ svc }: { svc: ServiceStatus }) {
  const color = STATE_COLOR[svc.state]
  const max = Math.max(...svc.spark)
  return (
    <div className="flex items-center gap-2 border border-line bg-bg/30 px-2 py-1.5">
      <StatusDot color={color} pulse={svc.state !== 'down'} size={6} />
      <span className="w-28 truncate text-xs text-text">{svc.name}</span>
      <svg viewBox="0 0 64 18" className="h-4 flex-1" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={1}
          points={svc.spark.map((v, i) => `${(i / (svc.spark.length - 1)) * 64},${18 - (v / max) * 16}`).join(' ')}
        />
      </svg>
      <span className="w-12 text-right text-[10px] tabular-nums" style={{ color }}>
        {svc.state === 'down' ? '—' : `${svc.latency}ms`}
      </span>
    </div>
  )
}
