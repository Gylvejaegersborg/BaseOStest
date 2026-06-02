import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  Play,
  Power,
  PowerOff,
  RefreshCw,
  Timer,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'

interface N8nPageProps {
  open: boolean
  onClose: () => void
}

type WorkflowStatus = 'active' | 'inactive'
type ExecStatus = 'success' | 'error' | 'running' | 'waiting'

interface N8nNode {
  name: string
  type: string
}

interface N8nWorkflow {
  id: string
  name: string
  status: WorkflowStatus
  description: string
  nodes: N8nNode[]
  triggerType: 'webhook' | 'schedule' | 'manual'
  lastRun?: Date
  avgDurationMs: number
  tags: string[]
}

interface Execution {
  id: string
  workflowId: string
  workflowName: string
  status: ExecStatus
  startedAt: Date
  durationMs: number
  error?: string
}

const BASE_URL = 'http://homeserver:5678/api/v1'

let execSeq = 100

const WORKFLOWS: N8nWorkflow[] = [
  {
    id: 'wf-001',
    name: 'Beat Release Notifier',
    status: 'active',
    description: 'Monitors the beat store for new releases and posts to Discord + Instagram Stories via the ISΛRK bot.',
    nodes: [
      { name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger' },
      { name: 'Beat Store API', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Filter New', type: 'n8n-nodes-base.filter' },
      { name: 'Discord', type: 'n8n-nodes-base.discord' },
      { name: 'Instagram', type: 'n8n-nodes-base.httpRequest' },
    ],
    triggerType: 'schedule',
    lastRun: new Date(Date.now() - 1000 * 60 * 37),
    avgDurationMs: 1840,
    tags: ['marketing', 'beats'],
  },
  {
    id: 'wf-002',
    name: 'Vault → Beat DB Sync',
    status: 'active',
    description: 'Watches for new audio files dropped into the Copyparty vault and syncs metadata into the Beat DB.',
    nodes: [
      { name: 'Webhook', type: 'n8n-nodes-base.webhook' },
      { name: 'Extract Metadata', type: 'n8n-nodes-base.executeCommand' },
      { name: 'Upsert Beat DB', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Notify OS', type: 'n8n-nodes-base.httpRequest' },
    ],
    triggerType: 'webhook',
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2.3),
    avgDurationMs: 620,
    tags: ['vault', 'sync'],
  },
  {
    id: 'wf-003',
    name: 'Daily Studio Summary',
    status: 'active',
    description: 'Pulls today\'s completed song tracker tasks and sends a digest to the personal Discord channel each evening.',
    nodes: [
      { name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger' },
      { name: 'Song Tracker API', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Format Digest', type: 'n8n-nodes-base.code' },
      { name: 'Discord DM', type: 'n8n-nodes-base.discord' },
    ],
    triggerType: 'schedule',
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 14),
    avgDurationMs: 980,
    tags: ['daily', 'studio'],
  },
  {
    id: 'wf-004',
    name: 'Sample Pack Packager',
    status: 'inactive',
    description: 'Bundles stems and loops from a release folder into a zip, uploads to Copyparty, and generates a share link.',
    nodes: [
      { name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger' },
      { name: 'Read Folder', type: 'n8n-nodes-base.executeCommand' },
      { name: 'Zip Files', type: 'n8n-nodes-base.executeCommand' },
      { name: 'Upload Copyparty', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Generate Link', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Respond', type: 'n8n-nodes-base.respondToWebhook' },
    ],
    triggerType: 'manual',
    avgDurationMs: 4200,
    tags: ['release', 'samples'],
  },
  {
    id: 'wf-005',
    name: 'Lyrics → Notion Sync',
    status: 'inactive',
    description: 'Polls the Beat DB for songs with updated lyrics and mirrors them to a Notion database for writing sessions.',
    nodes: [
      { name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger' },
      { name: 'Beat DB', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Diff Check', type: 'n8n-nodes-base.code' },
      { name: 'Notion', type: 'n8n-nodes-base.notion' },
    ],
    triggerType: 'schedule',
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 48),
    avgDurationMs: 1120,
    tags: ['lyrics', 'notion'],
  },
]

const SEED_EXECUTIONS: Execution[] = [
  { id: 'ex-095', workflowId: 'wf-001', workflowName: 'Beat Release Notifier', status: 'success', startedAt: new Date(Date.now() - 1000 * 60 * 37), durationMs: 1920 },
  { id: 'ex-096', workflowId: 'wf-002', workflowName: 'Vault → Beat DB Sync', status: 'success', startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2.3), durationMs: 580 },
  { id: 'ex-097', workflowId: 'wf-001', workflowName: 'Beat Release Notifier', status: 'error', startedAt: new Date(Date.now() - 1000 * 60 * 60 * 1.1), durationMs: 340, error: 'Discord API returned 429 Too Many Requests' },
  { id: 'ex-098', workflowId: 'wf-003', workflowName: 'Daily Studio Summary', status: 'success', startedAt: new Date(Date.now() - 1000 * 60 * 60 * 14), durationMs: 1010 },
  { id: 'ex-099', workflowId: 'wf-002', workflowName: 'Vault → Beat DB Sync', status: 'success', startedAt: new Date(Date.now() - 1000 * 60 * 60 * 5), durationMs: 660 },
]

const EXEC_COLOR: Record<ExecStatus, string> = {
  success: '#46d369',
  error: '#ff5566',
  running: '#36e0c8',
  waiting: '#f0a020',
}

const TRIGGER_ICON: Record<N8nWorkflow['triggerType'], typeof Zap> = {
  webhook: Zap,
  schedule: Timer,
  manual: Play,
}

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function fmtAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${(s / 3600).toFixed(1)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function N8nPage({ open, onClose }: N8nPageProps) {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>(WORKFLOWS)
  const [executions, setExecutions] = useState<Execution[]>(SEED_EXECUTIONS)
  const [selectedId, setSelectedId] = useState<string>(WORKFLOWS[0].id)
  const [triggering, setTriggering] = useState<Set<string>>(new Set())
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    return () => { timers.current.forEach(clearTimeout) }
  }, [])

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms)
    timers.current.push(t)
  }

  const triggerWorkflow = (wf: N8nWorkflow) => {
    setTriggering((s) => new Set(s).add(wf.id))

    const runId = `ex-${String(++execSeq).padStart(3, '0')}`
    const startedAt = new Date()

    setExecutions((prev) => [{
      id: runId,
      workflowId: wf.id,
      workflowName: wf.name,
      status: 'running' as ExecStatus,
      startedAt,
      durationMs: 0,
    }, ...prev].slice(0, 30))

    const duration = wf.avgDurationMs * (0.7 + Math.random() * 0.6)
    const willFail = Math.random() < 0.1

    schedule(() => {
      setTriggering((s) => { const n = new Set(s); n.delete(wf.id); return n })
      setExecutions((prev) => prev.map((e) =>
        e.id === runId
          ? {
              ...e,
              status: willFail ? 'error' : 'success',
              durationMs: Math.round(duration),
              error: willFail ? 'Node "HTTP Request" timed out after 5000ms' : undefined,
            }
          : e,
      ))
      setWorkflows((prev) => prev.map((w) =>
        w.id === wf.id ? { ...w, lastRun: new Date() } : w,
      ))
    }, duration)
  }

  const toggleWorkflow = (wf: N8nWorkflow) => {
    setToggling((s) => new Set(s).add(wf.id))
    schedule(() => {
      setToggling((s) => { const n = new Set(s); n.delete(wf.id); return n })
      setWorkflows((prev) => prev.map((w) =>
        w.id === wf.id ? { ...w, status: w.status === 'active' ? 'inactive' : 'active' } : w,
      ))
    }, 600 + Math.random() * 400)
  }

  const refresh = () => {
    setRefreshing(true)
    schedule(() => setRefreshing(false), 900 + Math.random() * 600)
  }

  if (!open) return null

  const selected = workflows.find((w) => w.id === selectedId)!
  const activeCount = workflows.filter((w) => w.status === 'active').length
  const recentExecs = executions.slice(0, 12)
  const wfExecs = executions.filter((e) => e.workflowId === selectedId).slice(0, 8)

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg font-mono text-text">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-line bg-panel/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Workflow size={18} className="text-accent" />
          <h1 className="font-display text-lg uppercase tracking-wider text-text">n8n</h1>
          <span
            className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: '#f0a020', borderColor: '#f0a02055', backgroundColor: '#f0a02011' }}
          >
            <StatusDot color="#f0a020" size={6} /> mockup · no backend
          </span>
          <span
            className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: '#46d369', borderColor: '#46d36955', backgroundColor: '#46d36911' }}
          >
            <StatusDot color="#46d369" size={6} pulse /> {activeCount} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim transition-colors hover:border-accent/60 hover:text-accent"
          >
            <RefreshCw size={11} className={cn(refreshing && 'animate-spin')} /> Refresh
          </button>
          <button onClick={onClose} className="text-dim transition-colors hover:text-text">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Workflow list */}
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-line bg-panel/30">
          <div className="border-b border-line px-3 py-2 text-[10px] uppercase tracking-widest text-dim">
            Workflows · {workflows.length}
          </div>
          <div className="flex-1 overflow-y-auto">
            {workflows.map((wf) => {
              const TIcon = TRIGGER_ICON[wf.triggerType]
              const isActive = wf.status === 'active'
              return (
                <button
                  key={wf.id}
                  onClick={() => setSelectedId(wf.id)}
                  className={cn(
                    'flex w-full flex-col gap-1 border-b border-line px-3 py-2.5 text-left transition-colors hover:bg-panel/50',
                    selectedId === wf.id && 'bg-panel/60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot
                      color={isActive ? '#46d369' : '#6b7785'}
                      size={6}
                      pulse={isActive}
                    />
                    <span className={cn('flex-1 truncate text-xs', selectedId === wf.id ? 'text-accent' : 'text-text')}>
                      {wf.name}
                    </span>
                    {selectedId === wf.id && <ChevronRight size={11} className="shrink-0 text-accent" />}
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <TIcon size={9} className="text-dim" />
                    <span className="text-[10px] text-dim">{wf.triggerType}</span>
                    {wf.lastRun && (
                      <span className="ml-auto text-[10px] text-dim">{fmtAgo(wf.lastRun)}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Detail + executions */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Workflow detail */}
          <div className="border-b border-line bg-panel/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base tracking-wider text-text">{selected.name}</h2>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-dim">{selected.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.tags.map((t) => (
                    <span key={t} className="border border-line px-1.5 py-0.5 text-[10px] text-dim">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleWorkflow(selected)}
                  disabled={toggling.has(selected.id)}
                  className={cn(
                    'flex items-center gap-1.5 border px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors',
                    toggling.has(selected.id)
                      ? 'cursor-not-allowed border-line text-dim opacity-60'
                      : selected.status === 'active'
                      ? 'border-danger/50 bg-danger/10 text-danger hover:bg-danger/20'
                      : 'border-neon-green/50 bg-neon-green/10 text-neon-green hover:bg-neon-green/20',
                  )}
                >
                  {toggling.has(selected.id)
                    ? <Loader2 size={12} className="animate-spin" />
                    : selected.status === 'active'
                    ? <PowerOff size={12} />
                    : <Power size={12} />}
                  {selected.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => triggerWorkflow(selected)}
                  disabled={triggering.has(selected.id)}
                  className={cn(
                    'flex items-center gap-1.5 border px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors',
                    triggering.has(selected.id)
                      ? 'cursor-not-allowed border-line text-dim opacity-60'
                      : 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20',
                  )}
                >
                  {triggering.has(selected.id)
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Play size={12} />}
                  Run now
                </button>
              </div>
            </div>

            {/* Node flow strip */}
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {selected.nodes.map((node, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="border border-line bg-bg/60 px-2 py-1 text-[10px] text-dim">
                    {node.name}
                  </div>
                  {i < selected.nodes.length - 1 && (
                    <ChevronRight size={11} className="text-dim opacity-40" />
                  )}
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-dim">
              <span className="flex items-center gap-1">
                <Clock size={10} /> avg {fmtDuration(selected.avgDurationMs)}
              </span>
              {selected.lastRun && (
                <span className="flex items-center gap-1">
                  <Activity size={10} /> last run {fmtAgo(selected.lastRun)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Circle size={10} /> {selected.nodes.length} nodes
              </span>
              <span className="ml-auto font-mono text-[10px] text-dim/60">
                {BASE_URL}/workflows/{selected.id}/run
              </span>
            </div>
          </div>

          {/* Execution log split */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* This workflow's runs */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-line">
              <div className="border-b border-line px-3 py-2 text-[10px] uppercase tracking-widest text-dim">
                This workflow · executions
              </div>
              <ExecList executions={wfExecs} />
            </div>

            {/* All recent runs */}
            <div className="flex w-[300px] shrink-0 flex-col overflow-hidden">
              <div className="border-b border-line px-3 py-2 text-[10px] uppercase tracking-widest text-dim">
                All workflows · recent
              </div>
              <ExecList executions={recentExecs} compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Execution list ─────────────────────────────────────────────────────── */

function ExecList({ executions, compact }: { executions: Execution[]; compact?: boolean }) {
  if (executions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-dim">
        <Activity size={22} className="opacity-30" />
        <p className="text-xs">No executions yet.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-line">
      {executions.map((e) => (
        <ExecRow key={e.id} exec={e} compact={compact} />
      ))}
    </div>
  )
}

function ExecRow({ exec, compact }: { exec: Execution; compact?: boolean }) {
  const color = EXEC_COLOR[exec.status]

  return (
    <div className={cn('flex items-start gap-3 px-3 hover:bg-panel/20', compact ? 'py-2' : 'py-2.5')}>
      <div className="mt-0.5 shrink-0" style={{ color }}>
        {exec.status === 'success' && <CheckCircle2 size={13} />}
        {exec.status === 'error' && <AlertCircle size={13} />}
        {exec.status === 'running' && <Loader2 size={13} className="animate-spin" />}
        {exec.status === 'waiting' && <Clock size={13} />}
      </div>
      <div className="min-w-0 flex-1">
        {compact && (
          <p className="truncate text-[11px] text-text">{exec.workflowName}</p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color }}>{exec.status}</span>
          <span className="text-[10px] text-dim">{fmtAgo(exec.startedAt)}</span>
          {exec.status !== 'running' && (
            <span className="text-[10px] text-dim">{fmtDuration(exec.durationMs)}</span>
          )}
          <span className="ml-auto font-mono text-[10px] text-dim/50">{exec.id}</span>
        </div>
        {exec.error && !compact && (
          <p className="mt-0.5 truncate text-[10px] text-danger">{exec.error}</p>
        )}
      </div>
    </div>
  )
}

/* ── Status badge ───────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const color = status === 'active' ? '#46d369' : '#6b7785'
  return (
    <span
      className="flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}11` }}
    >
      <StatusDot color={color} size={5} pulse={status === 'active'} />
      {status}
    </span>
  )
}
