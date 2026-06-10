import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, Check, Terminal, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { clock } from '@/lib/time'
import { cn } from '@/lib/cn'

interface PipelineMonitorPageProps {
  open: boolean
  onClose: () => void
}

type StageStatus = 'idle' | 'running' | 'done' | 'error'

interface Stage {
  id: string
  label: string
  /** average duration in seconds, shown under the stage box */
  avg: number
}

const STAGES: Stage[] = [
  { id: 'record', label: 'RECORD', avg: 95 },
  { id: 'mix', label: 'MIX', avg: 140 },
  { id: 'master', label: 'MASTER', avg: 72 },
  { id: 'tag', label: 'TAG', avg: 18 },
  { id: 'upload', label: 'UPLOAD', avg: 44 },
  { id: 'distribute', label: 'DISTRIBUTE', avg: 60 },
]

const STATUS_COLOR: Record<StageStatus, string> = {
  idle: '#6b7785',
  running: '#f0a020',
  done: '#46d369',
  error: '#ff5566',
}

interface Job {
  id: string
  track: string
  stage: number
  /** progress through the current stage, 0–100 */
  progress: number
  startedAt: number
  status: 'running' | 'error' | 'done'
  errorMsg?: string
  errorLog?: string[]
}

const ERRORS = [
  {
    msg: 'master gain overflow — clipping detected at +0.4 dBFS',
    log: [
      '[master] analysing loudness target -10.0 LUFS',
      '[master] true-peak limiter engaged',
      '[master] WARN sample 1842113 exceeds ceiling (+0.4 dBFS)',
      '[master] ERROR integrated loudness diverged, aborting',
      '[master] stage failed after 71s — manual review required',
    ],
  },
  {
    msg: 'upload rejected — distributor returned 413 (payload too large)',
    log: [
      '[upload] opening multipart session to dist-gateway',
      '[upload] chunk 1/6 ok',
      '[upload] chunk 2/6 ok',
      '[upload] retry 1/3 for chunk 3/6 (timeout)',
      '[upload] retry 2/3 for chunk 3/6 (timeout)',
      '[upload] ERROR 413 Payload Too Large — master exceeds 1.5GB cap',
    ],
  },
  {
    msg: 'tag metadata invalid — missing ISRC for distribution',
    log: [
      '[tag] reading sidecar metadata.json',
      '[tag] title ok · artist ok · artwork ok',
      '[tag] WARN ISRC field empty',
      '[tag] ERROR distribution requires a valid ISRC code',
      '[tag] stage halted — assign ISRC and requeue',
    ],
  },
]

let trackSeed = 427
function nextTrack(): string {
  trackSeed += Math.floor(Math.random() * 7) + 1
  return `track_${String(trackSeed).padStart(4, '0')}`
}

function makeJob(stage = 0): Job {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    track: nextTrack(),
    stage,
    progress: Math.floor(Math.random() * 40),
    startedAt: Date.now() - Math.floor(Math.random() * 90_000),
    status: 'running',
  }
}

function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

interface LogLine {
  time: string
  stage: string
  text: string
  kind: 'info' | 'ok' | 'warn' | 'err'
}

const LOG_KIND_COLOR: Record<LogLine['kind'], string> = {
  info: '#6b7785',
  ok: '#46d369',
  warn: '#f0a020',
  err: '#ff5566',
}

let logSeed = 0
function makeLogLine(): LogLine {
  logSeed += 1
  const track = `track_${String(400 + (logSeed * 13) % 99).padStart(4, '0')}`
  const events: Omit<LogLine, 'time'>[] = [
    { stage: 'master', text: `${track} -10.1 LUFS ✓`, kind: 'ok' },
    { stage: 'master', text: `${track} true-peak -1.0 dBTP`, kind: 'info' },
    { stage: 'upload', text: `retry 2/3 for ${track}`, kind: 'warn' },
    { stage: 'upload', text: `${track} 64% · 18.2 MB/s`, kind: 'info' },
    { stage: 'record', text: `${track} take captured · 24-bit/48k`, kind: 'info' },
    { stage: 'mix', text: `${track} bus automation applied`, kind: 'info' },
    { stage: 'tag', text: `${track} ISRC + artwork embedded ✓`, kind: 'ok' },
    { stage: 'distribute', text: `${track} pushed to 7 platforms ✓`, kind: 'ok' },
    { stage: 'distribute', text: `${track} awaiting store ingest`, kind: 'info' },
    { stage: 'mix', text: `${track} stem count 24 · headroom 6 dB`, kind: 'info' },
  ]
  return { time: clock(new Date()), ...events[logSeed % events.length] }
}

/**
 * Pipeline Monitor (archived) — a factory-style live view of the
 * record → mix → master → tag → upload → distribute pipeline. Jobs advance
 * through stages on a timer, a scoped tail-f log streams render events, and
 * any job that errors raises a banner that opens a full error log.
 *
 * Archived design: kept in the Lab as a reusable visualiser. The active
 * ISΛRK-focused tool is the Song Tracker (src/features/songtracker).
 */
export function PipelineMonitorPage({ open, onClose }: PipelineMonitorPageProps) {
  const [jobs, setJobs] = useState<Job[]>(() => [
    makeJob(0),
    makeJob(1),
    makeJob(2),
    makeJob(4),
  ])
  const [recent, setRecent] = useState<Job[]>([])
  const [logs, setLogs] = useState<LogLine[]>(() => Array.from({ length: 8 }, makeLogLine))
  const [jobsToday, setJobsToday] = useState(12)
  const [now, setNow] = useState(Date.now())
  const [errorDetail, setErrorDetail] = useState<Job | null>(null)
  const logScrollRef = useRef<HTMLDivElement>(null)

  // Esc closes the app.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Tick a clock so "duration so far" stays live without re-simulating.
  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [open])

  // Advance the pipeline every ~2s.
  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => {
      setJobs((prev) => {
        const stillActive: Job[] = []
        const completed: Job[] = []
        for (const job of prev) {
          if (job.status === 'error') {
            stillActive.push(job)
            continue
          }
          // Rare error injection on running jobs.
          if (Math.random() < 0.05) {
            const e = ERRORS[Math.floor(Math.random() * ERRORS.length)]
            stillActive.push({ ...job, status: 'error', errorMsg: e.msg, errorLog: e.log })
            continue
          }
          const progress = job.progress + Math.floor(Math.random() * 28) + 12
          if (progress < 100) {
            stillActive.push({ ...job, progress })
            continue
          }
          // Stage complete — advance or finish.
          if (job.stage >= STAGES.length - 1) {
            completed.push({ ...job, status: 'done', progress: 100 })
          } else {
            stillActive.push({ ...job, stage: job.stage + 1, progress: 0 })
          }
        }

        if (completed.length) {
          setRecent((r) => [...completed, ...r].slice(0, 6))
          setJobsToday((n) => n + completed.length)
        }

        // Keep the queue populated: top up when it thins out.
        const active = stillActive.filter((j) => j.status !== 'error').length
        if (active < 3 && Math.random() < 0.6) stillActive.push(makeJob(0))

        return stillActive.slice(0, 6)
      })
    }, 2000)
    return () => window.clearInterval(id)
  }, [open])

  // Stream render events into the log.
  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => {
      setLogs((l) => [...l.slice(-80), makeLogLine()])
    }, 1800)
    return () => window.clearInterval(id)
  }, [open])

  // Auto-scroll the log only when already near the bottom.
  useEffect(() => {
    const el = logScrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [logs])

  // Derive per-stage status for the pipeline diagram from the active jobs.
  const stageStatus = useMemo<StageStatus[]>(() => {
    const out: StageStatus[] = STAGES.map(() => 'idle')
    for (const job of jobs) {
      const cur = out[job.stage]
      if (job.status === 'error') out[job.stage] = 'error'
      else if (cur !== 'error') out[job.stage] = 'running'
    }
    // Mark stages every active job has passed as done (dim green).
    if (jobs.length) {
      const minStage = Math.min(...jobs.map((j) => j.stage))
      for (let i = 0; i < minStage; i++) if (out[i] === 'idle') out[i] = 'done'
    }
    return out
  }, [jobs])

  const errored = jobs.filter((j) => j.status === 'error')
  const queueDepth = jobs.filter((j) => j.status !== 'error').length

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg font-mono text-text">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel/70 px-3 backdrop-blur sm:px-4">
        <div className="flex shrink-0 items-center gap-2">
          <Activity size={16} className="text-amber" />
          <span className="font-display text-sm tracking-wider text-text">RENDER QUEUE MONITOR</span>
          <span className="hidden text-[9px] uppercase tracking-[0.2em] text-dim sm:inline">
            record → master → distribute
          </span>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neon-green">
          <StatusDot color="#46d369" pulse size={6} /> live
        </span>
        <button onClick={onClose} aria-label="Close Render Queue" className="shrink-0 text-dim transition-colors hover:text-text">
          <X size={18} />
        </button>
      </header>

      {/* Error banner */}
      {errored.length > 0 && (
        <button
          onClick={() => setErrorDetail(errored[0])}
          className="flex shrink-0 animate-fade-in items-center gap-2 border-b border-danger/40 bg-danger/10 px-4 py-2 text-left transition-colors hover:bg-danger/20"
        >
          <AlertTriangle size={14} className="shrink-0 text-danger" />
          <span className="text-xs text-danger">
            <span className="font-display tracking-wider">{errored[0].track}</span> failed in{' '}
            <span className="uppercase">{STAGES[errored[0].stage].label}</span> — {errored[0].errorMsg}
          </span>
          {errored.length > 1 && (
            <span className="ml-1 text-[10px] text-danger/70">(+{errored.length - 1} more)</span>
          )}
          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-danger/80">view log →</span>
        </button>
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:overflow-y-auto">
          <Pipeline status={stageStatus} />
          <ActiveJobs jobs={jobs} now={now} onErrorClick={setErrorDetail} />
          <Recent recent={recent} now={now} />
          <Stats jobsToday={jobsToday} queueDepth={queueDepth} />
        </div>

        {/* Live event log — right panel */}
        <aside className="flex h-64 shrink-0 flex-col border-t border-line bg-panel/40 lg:h-auto lg:w-[280px] lg:border-l lg:border-t-0">
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-2 text-[10px] uppercase tracking-wider text-amber">
            <Terminal size={11} /> render events
          </div>
          <div ref={logScrollRef} className="min-h-0 flex-1 overflow-y-auto p-2 text-[11px] leading-relaxed">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-1.5 whitespace-nowrap">
                <span className="text-dim tabular-nums">{l.time}</span>
                <span className="text-amber">[{l.stage}]</span>
                <span style={{ color: LOG_KIND_COLOR[l.kind] }}>{l.text}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Error detail modal */}
      <Modal
        open={!!errorDetail}
        onClose={() => setErrorDetail(null)}
        title={errorDetail?.track}
        code="RENDER ERROR"
        accent="#ff5566"
        width={560}
      >
        {errorDetail && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Badge color="#ff5566">{STAGES[errorDetail.stage].label}</Badge>
              <span className="text-text/85">{errorDetail.errorMsg}</span>
            </div>
            <div className="border border-line bg-bg/60 p-3 text-[11px] leading-relaxed">
              {(errorDetail.errorLog ?? []).map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'whitespace-pre-wrap',
                    line.includes('ERROR') ? 'text-danger' : line.includes('WARN') ? 'text-amber' : 'text-text/70',
                  )}
                >
                  {line}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-dim">
              Job started {fmtDuration(now - errorDetail.startedAt)} ago · queued for manual review.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ── Pipeline diagram ───────────────────────────────────────────────── */

function Pipeline({ status }: { status: StageStatus[] }) {
  return (
    <section className="border border-line bg-panel/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-dim">
        <span className="font-display tracking-wider text-text">Pipeline</span> · 6 stages
      </div>
      <div className="flex items-stretch gap-1 overflow-x-auto">
        {STAGES.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-1">
            <StageBox stage={stage} status={status[i]} />
            {i < STAGES.length - 1 && (
              <span
                className="shrink-0 text-sm"
                style={{ color: status[i] === 'done' ? '#46d369' : '#2a3442' }}
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function StageBox({ stage, status }: { stage: Stage; status: StageStatus }) {
  const color = STATUS_COLOR[status]
  const isRunning = status === 'running'
  const isDone = status === 'done'
  return (
    <div
      className={cn(
        'relative flex min-w-[88px] flex-col gap-1 border bg-bg/50 px-2.5 py-2 transition-all',
        isRunning && 'animate-pulse-dot',
      )}
      style={{
        borderColor: `${color}66`,
        boxShadow: isRunning ? `0 0 12px -2px ${color}` : undefined,
        opacity: isDone ? 0.7 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[11px] tracking-wider" style={{ color }}>
          {stage.label}
        </span>
        {isDone ? (
          <Check size={11} style={{ color: '#46d369' }} />
        ) : (
          <StatusDot color={color} pulse={isRunning} size={6} />
        )}
      </div>
      <span className="text-[9px] tabular-nums text-dim">~{fmtDuration(stage.avg * 1000)}</span>
    </div>
  )
}

/* ── Active jobs table ──────────────────────────────────────────────── */

function ActiveJobs({
  jobs,
  now,
  onErrorClick,
}: {
  jobs: Job[]
  now: number
  onErrorClick: (job: Job) => void
}) {
  return (
    <section className="border border-line bg-panel/60">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="font-display text-sm uppercase tracking-wider text-text">Active Jobs</span>
        <span className="text-[10px] tabular-nums text-dim">{jobs.length} in pipeline</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
              <th className="px-3 py-1.5 font-normal">Track</th>
              <th className="px-3 py-1.5 font-normal">Stage</th>
              <th className="w-[28%] px-3 py-1.5 font-normal">Progress</th>
              <th className="px-3 py-1.5 font-normal">Duration</th>
              <th className="px-3 py-1.5 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-dim">
                  Queue is empty — waiting for new renders.
                </td>
              </tr>
            )}
            {jobs.map((job) => {
              const stage = STAGES[job.stage]
              const isErr = job.status === 'error'
              const color = isErr ? '#ff5566' : '#f0a020'
              return (
                <tr
                  key={job.id}
                  className={cn('border-b border-line/60 last:border-0', isErr && 'cursor-pointer hover:bg-danger/5')}
                  onClick={isErr ? () => onErrorClick(job) : undefined}
                >
                  <td className="px-3 py-2 font-display tracking-wide text-text">{job.track}</td>
                  <td className="px-3 py-2">
                    <span className="uppercase tracking-wider" style={{ color }}>
                      {stage.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-1.5 w-full bg-bg">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${isErr ? 100 : job.progress}%`,
                          backgroundColor: color,
                          boxShadow: `0 0 6px ${color}`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-dim">{fmtDuration(now - job.startedAt)}</td>
                  <td className="px-3 py-2">
                    {isErr ? (
                      <Badge color="#ff5566">error</Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <StatusDot color="#f0a020" pulse size={5} />
                        <span className="text-[10px] uppercase tracking-wider text-amber">running</span>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ── Recent (completed) ─────────────────────────────────────────────── */

function Recent({ recent, now }: { recent: Job[]; now: number }) {
  if (recent.length === 0) return null
  return (
    <section className="border border-line bg-panel/60">
      <div className="border-b border-line px-3 py-2">
        <span className="font-display text-sm uppercase tracking-wider text-text">Recent</span>
      </div>
      <div className="divide-y divide-line/60">
        {recent.map((job) => (
          <div key={job.id} className="flex items-center gap-3 px-3 py-2 text-xs">
            <Check size={13} className="text-neon-green" />
            <span className="font-display tracking-wide text-text">{job.track}</span>
            <span className="text-dim">distributed</span>
            <span className="ml-auto tabular-nums text-dim">{fmtDuration(now - job.startedAt)}</span>
            <Badge color="#46d369">done</Badge>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Stats bar ──────────────────────────────────────────────────────── */

function Stats({ jobsToday, queueDepth }: { jobsToday: number; queueDepth: number }) {
  const cards = [
    { label: 'Jobs today', value: String(jobsToday), color: '#c8d2dc' },
    { label: 'Avg pipeline time', value: '4m 32s', color: '#36e0c8' },
    { label: 'Error rate', value: '2.1%', color: '#f0a020' },
    { label: 'Queue depth', value: String(queueDepth), color: '#46d369', live: true },
  ]
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="border border-line bg-panel/60 px-3 py-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-dim">
            {c.live && <StatusDot color={c.color} pulse size={5} />}
            {c.label}
          </div>
          <div className="mt-1 font-display text-2xl tabular-nums" style={{ color: c.color }}>
            {c.value}
          </div>
        </div>
      ))}
    </section>
  )
}
