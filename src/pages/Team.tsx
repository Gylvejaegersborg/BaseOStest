import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  CheckCircle2, ClipboardList, Eye, EyeOff, FileAudio, Inbox, Key, LineChart, ListChecks,
  Mail, MessageSquare, Newspaper, RefreshCw, ThumbsDown, ThumbsUp, Users2, X,
} from 'lucide-react'
import { AGENTS } from '@/data/agents'
import { Panel } from '@/components/ui/Panel'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import { dispatchWorkflow, fetchFile, getToken, listDir } from '@/features/team/githubClient'
import { useTeamState } from '@/features/team/useTeamState'
import type { ApprovalItem, IntakeRecord, TeamTask, TeamTaskStatus } from '@/features/team/types'

type Tab = 'brief' | 'board' | 'approvals' | 'intake' | 'reports' | 'meetings'

const TABS: { id: Tab; label: string; icon: typeof Newspaper }[] = [
  { id: 'brief', label: 'Brief', icon: Newspaper },
  { id: 'board', label: 'Board', icon: ClipboardList },
  { id: 'approvals', label: 'Approvals', icon: ListChecks },
  { id: 'intake', label: 'Intake', icon: Inbox },
  { id: 'reports', label: 'Reports', icon: LineChart },
  { id: 'meetings', label: 'Meetings', icon: Users2 },
]

const CONNECTION_META = {
  connecting: { label: 'CONNECTING', color: '#f0a020' },
  live: { label: 'LIVE', color: '#46d369' },
  mock: { label: 'MOCK — connect GitHub', color: '#6b7785' },
  error: { label: 'UNREACHABLE — showing mock', color: '#ff5566' },
} as const

function agentColor(id: string): string {
  return AGENTS.find((a) => a.id === id)?.color ?? '#6b7785'
}

export function Team() {
  const team = useTeamState()
  const [tab, setTab] = useState<Tab>('brief')
  const [showTokenPanel, setShowTokenPanel] = useState(false)
  const conn = CONNECTION_META[team.connection]
  const pendingCount = team.approvals.filter((a) => a.status === 'pending').length

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="font-display text-lg tracking-wider text-text">MANAGEMENT TEAM</h1>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: conn.color }}>
          <StatusDot color={conn.color} pulse={team.connection === 'live'} size={6} />
          {conn.label}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={team.refresh}
            className="flex items-center gap-1.5 border border-line px-2 py-1 text-[11px] text-dim hover:border-accent/60 hover:text-accent"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            onClick={() => setShowTokenPanel((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 border px-2 py-1 text-[11px]',
              team.hasToken ? 'border-line text-dim hover:text-text' : 'border-amber/40 bg-amber/10 text-amber/80 hover:bg-amber/20',
            )}
          >
            <Key size={12} /> {team.hasToken ? 'GitHub connected' : 'Connect GitHub'}
          </button>
        </div>
      </div>

      {showTokenPanel && (
        <TokenPanel onSave={team.saveToken} onClose={() => setShowTokenPanel(false)} />
      )}

      <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors',
              tab === t.id ? 'border border-accent/40 bg-accent/10 text-accent' : 'border border-transparent text-dim hover:text-text',
            )}
          >
            <t.icon size={13} /> {t.label}
            {t.id === 'approvals' && pendingCount > 0 && (
              <span className="ml-0.5 border border-amber/50 bg-amber/15 px-1 text-[10px] text-amber">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'brief' && <BriefTab brief={team.brief} agents={team.agents} />}
        {tab === 'board' && <BoardTab tasks={team.tasks} />}
        {tab === 'approvals' && <ApprovalsTab approvals={team.approvals} onResolved={team.refresh} />}
        {tab === 'intake' && <IntakeTab records={team.intake} live={team.connection === 'live'} />}
        {tab === 'reports' && <ReportsTab live={team.connection === 'live'} />}
        {tab === 'meetings' && <MeetingsTab live={team.connection === 'live'} />}
      </div>
    </div>
  )
}

// ── Brief ────────────────────────────────────────────────────────────────────
function BriefTab({ brief, agents }: { brief: string; agents: ReturnType<typeof useTeamState>['agents'] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
      <Panel title="Daily Brief" code="TEAM.BRF" accent="#f0a020">
        {brief ? (
          <article className="prose-term">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief}</ReactMarkdown>
          </article>
        ) : (
          <p className="text-xs text-dim">
            No brief yet. The team writes one at every daily meeting (07:30 Oslo) — or trigger
            “Team · Daily Meeting” from the Actions tab to get the first one now.
          </p>
        )}
      </Panel>
      <Panel title="Roster" code="TEAM.AGT" accent="#36e0c8" bodyClassName="space-y-2 p-2">
        {agents.map((a) => (
          <div key={a.id} className="border border-line bg-bg/40 p-2" style={{ borderLeftColor: agentColor(a.id), borderLeftWidth: 2 }}>
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: agentColor(a.id) }}>{a.name}</span>
              <span className="text-[10px] text-dim">{a.role}</span>
              <span className="ml-auto text-[9px] uppercase tracking-wider text-dim">{a.status}</span>
            </div>
            <div className="mt-1 text-[11px] text-text/80">{a.task}</div>
          </div>
        ))}
      </Panel>
    </div>
  )
}

// ── Board ────────────────────────────────────────────────────────────────────
const BOARD_COLUMNS: { id: TeamTaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: '#6b7785' },
  { id: 'doing', label: 'Doing', color: '#46d369' },
  { id: 'review', label: 'Review', color: '#f0a020' },
  { id: 'blocked', label: 'Blocked', color: '#ff5566' },
  { id: 'done', label: 'Done', color: '#36e0c8' },
]

function BoardTab({ tasks }: { tasks: TeamTask[] }) {
  if (!tasks.length) {
    return <p className="p-2 text-xs text-dim">No tasks on the board yet — they appear once the team holds its first meeting.</p>
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {BOARD_COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.id)
        return (
          <Panel key={col.id} title={col.label} code={String(items.length)} accent={col.color} bodyClassName="space-y-2 p-2">
            {items.map((t) => (
              <div key={t.id} className="border border-line bg-bg/40 p-2">
                <div className="text-xs text-text">{t.title}</div>
                {t.notes && <div className="mt-1 text-[10px] leading-relaxed text-dim">{t.notes}</div>}
                <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                  <StatusDot color={agentColor(t.owner)} size={5} />
                  <span style={{ color: agentColor(t.owner) }}>{t.owner}</span>
                  {t.handedFrom && <span className="text-dim">← {t.handedFrom}</span>}
                  {t.due && <span className="ml-auto text-dim">due {t.due}</span>}
                </div>
              </div>
            ))}
            {!items.length && <div className="p-1 text-[10px] text-dim">—</div>}
          </Panel>
        )
      })}
    </div>
  )
}

// ── Approvals ────────────────────────────────────────────────────────────────
const TYPE_ICON: Record<ApprovalItem['type'], typeof Mail> = {
  youtube_upload: FileAudio,
  soundcloud_upload: FileAudio,
  social_post: MessageSquare,
  booking_reply: Mail,
  site_publish: CheckCircle2,
}

function ApprovalsTab({ approvals, onResolved }: { approvals: ApprovalItem[]; onResolved: () => void }) {
  const [dispatched, setDispatched] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const act = async (item: ApprovalItem, decision: 'approve' | 'reject') => {
    setError('')
    try {
      await dispatchWorkflow('team-publish.yml', { action_id: item.id, decision })
      setDispatched((d) => ({ ...d, [item.id]: decision }))
      // The publish workflow commits the resolution; give it a moment, then refetch.
      window.setTimeout(onResolved, 75_000)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const pending = approvals.filter((a) => a.status === 'pending')
  const resolved = approvals.filter((a) => a.status !== 'pending')

  return (
    <div className="space-y-3">
      {error && <p className="border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}
      {!pending.length && (
        <p className="p-2 text-xs text-dim">Nothing waiting for you. Agents queue every outward-facing action here before it can happen.</p>
      )}
      {pending.map((item) => {
        const Icon = TYPE_ICON[item.type]
        const done = dispatched[item.id]
        return (
          <Panel key={item.id} title={item.title} code={item.type.toUpperCase()} accent="#f0a020">
            <div className="mb-2 flex items-center gap-2 text-[10px] text-dim">
              <Icon size={12} />
              <span>drafted by <span style={{ color: agentColor(item.draftedBy) }}>{item.draftedBy}</span></span>
              <span>· {item.createdAt.slice(0, 10)}</span>
            </div>
            <p className="mb-2 text-xs leading-relaxed text-text/85">{item.summary}</p>
            <DraftPreview paths={item.draftPaths} />
            {done ? (
              <p className="mt-2 text-xs text-amber">
                {done === 'approve' ? 'Approval' : 'Rejection'} dispatched — the publish workflow is running; this list refreshes when it lands.
              </p>
            ) : (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => act(item, 'approve')}
                  className="flex items-center gap-1.5 border border-ok/40 bg-ok/10 px-3 py-1.5 text-xs uppercase tracking-wider text-ok hover:bg-ok/20"
                  style={{ borderColor: '#46d36966', color: '#46d369', backgroundColor: '#46d36915' }}
                >
                  <ThumbsUp size={13} /> Approve
                </button>
                <button
                  onClick={() => act(item, 'reject')}
                  className="flex items-center gap-1.5 border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs uppercase tracking-wider text-danger hover:bg-danger/20"
                >
                  <ThumbsDown size={13} /> Reject
                </button>
              </div>
            )}
          </Panel>
        )
      })}
      {resolved.length > 0 && (
        <Panel title="Recently resolved" code="TEAM.LOG" accent="#6b7785" bodyClassName="space-y-1.5 p-2">
          {resolved.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-[11px]">
              <span className="uppercase tracking-wider text-dim">{item.status}</span>
              <span className="text-text/80">{item.title}</span>
              {item.result && <span className="truncate text-dim">— {item.result}</span>}
            </div>
          ))}
        </Panel>
      )}
    </div>
  )
}

function DraftPreview({ paths }: { paths: string[] }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  useEffect(() => {
    if (!open || content) return
    Promise.all(paths.map((p) => fetchFile(p).then((c) => `## ${p}\n\n${c}`).catch(() => `## ${p}\n\n_(unreadable)_`)))
      .then((parts) => setContent(parts.join('\n\n---\n\n')))
  }, [open, content, paths])
  if (!paths.length) return null
  return (
    <div className="border border-line bg-bg/40">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[11px] text-dim hover:text-text">
        <Eye size={11} /> {open ? 'Hide draft' : `Preview draft (${paths.length} file${paths.length > 1 ? 's' : ''})`}
      </button>
      {open && (
        <div className="border-t border-line p-3">
          <article className="prose-term">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || 'Loading…'}</ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  )
}

// ── Intake ───────────────────────────────────────────────────────────────────
function IntakeTab({ records, live }: { records: IntakeRecord[]; live: boolean }) {
  if (!records.length) {
    return (
      <p className="p-2 text-xs text-dim">
        {live
          ? 'Inbox is empty. Beats sent via Discord, email or the copyparty drop folder land here with real measured features and Aether’s read.'
          : 'Connect GitHub to see the live intake inbox.'}
      </p>
    )
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {records.map((r) => (
        <Panel
          key={r.id}
          title={r.analysis?.suggestedTitle || r.subject || r.id}
          code={`${r.source.toUpperCase()} · ${r.kind.toUpperCase()}`}
          accent={r.kind === 'audio' ? '#58b6f0' : '#46d369'}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-dim">
            <span>{r.receivedAt.slice(0, 16).replace('T', ' ')}</span>
            {r.from && <span>· from {r.from}</span>}
            <span className="ml-auto uppercase tracking-wider">{r.status}</span>
          </div>
          {r.features && (
            <div className="mb-2 grid grid-cols-3 gap-1.5 text-center">
              <FeatureChip label="BPM" value={r.features.bpm != null ? String(r.features.bpm) : '—'} />
              <FeatureChip label="KEY" value={r.features.key ?? '—'} />
              <FeatureChip label="LUFS" value={r.features.lufs != null ? String(r.features.lufs) : '—'} />
            </div>
          )}
          {r.analysis ? (
            <>
              <p className="text-xs leading-relaxed text-text/85">{r.analysis.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span
                  className="border px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                  style={{
                    borderColor: r.analysis.verdict === 'keep' ? '#46d36966' : r.analysis.verdict === 'maybe' ? '#f0a02066' : '#ff556666',
                    color: r.analysis.verdict === 'keep' ? '#46d369' : r.analysis.verdict === 'maybe' ? '#f0a020' : '#ff5566',
                  }}
                >
                  {r.analysis.verdict}
                </span>
                {r.analysis.mood.map((m) => (
                  <span key={m} className="border border-line px-1.5 py-0.5 text-[9px] text-dim">{m}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-dim">
              {r.kind === 'audio' ? 'Awaiting Aether’s analysis (next intake run).' : (r.body ?? '').slice(0, 240)}
            </p>
          )}
        </Panel>
      ))}
    </div>
  )
}

function FeatureChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-bg/40 px-1 py-1.5">
      <div className="text-[8px] uppercase tracking-widest text-dim">{label}</div>
      <div className="font-display text-sm text-text">{value}</div>
    </div>
  )
}

// ── Reports ──────────────────────────────────────────────────────────────────
const REPORT_DIRS: { dir: string; label: string; color: string }[] = [
  { dir: 'team/reports/market', label: 'Market (Theia)', color: '#e3d24b' },
  { dir: 'team/reports/pipeline', label: 'Pipeline (Argus)', color: '#ff6b6b' },
  { dir: 'team/reports/analysis', label: 'Beat analysis (Aether)', color: '#58b6f0' },
]

function ReportsTab({ live }: { live: boolean }) {
  const [files, setFiles] = useState<{ path: string; name: string; group: string }[]>([])
  const [selected, setSelected] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!live) return
    Promise.all(
      REPORT_DIRS.map((d) =>
        listDir(d.dir)
          .then((entries) =>
            entries
              .filter((e) => e.type === 'file' && e.name.endsWith('.md'))
              .map((e) => ({ path: e.path, name: e.name.replace('.md', ''), group: d.label })),
          )
          .catch(() => []),
      ),
    ).then((groups) => {
      const flat = groups.flat()
      setFiles(flat)
      if (flat.length) setSelected((s) => s || flat[0].path)
    })
  }, [live])

  useEffect(() => {
    if (!selected) return
    setContent('')
    fetchFile(selected).then(setContent).catch(() => setContent('_Could not load report._'))
  }, [selected])

  if (!live) return <p className="p-2 text-xs text-dim">Connect GitHub to read the team's reports.</p>
  if (!files.length) {
    return (
      <p className="p-2 text-xs text-dim">
        No reports yet. Theia writes the weekly market read (Mondays), Argus writes a
        pipeline health report each run, and Aether writes a per-beat analysis on intake.
      </p>
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[230px_1fr]">
      <Panel title="Reports" code="TEAM.RPT" accent="#e3d24b" bodyClassName="space-y-1 p-2">
        {REPORT_DIRS.map((d) => {
          const group = files.filter((f) => f.group === d.label)
          if (!group.length) return null
          return (
            <div key={d.dir} className="mb-1">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: d.color }}>{d.label}</div>
              {group.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setSelected(f.path)}
                  className={cn(
                    'block w-full border-l-2 px-2 py-1.5 text-left text-xs transition-colors',
                    f.path === selected ? 'border-accent bg-accent/5 text-text' : 'border-transparent text-dim hover:text-text',
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )
        })}
      </Panel>
      <Panel title={files.find((f) => f.path === selected)?.name ?? 'Report'} code="REPORT" accent="#e3d24b">
        <article className="prose-term">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || 'Loading…'}</ReactMarkdown>
        </article>
      </Panel>
    </div>
  )
}

// ── Meetings ─────────────────────────────────────────────────────────────────
function MeetingsTab({ live }: { live: boolean }) {
  const [files, setFiles] = useState<string[]>([])
  const [selected, setSelected] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!live) return
    listDir('team/meetings')
      .then((entries) => {
        const md = entries
          .filter((e) => e.type === 'file' && e.name.endsWith('.md'))
          .map((e) => e.name)
          .sort()
          .reverse()
        setFiles(md)
        if (md.length) setSelected((s) => s || md[0])
      })
      .catch(() => setFiles([]))
  }, [live])

  useEffect(() => {
    if (!selected) return
    setContent('')
    fetchFile(`team/meetings/${selected}`).then(setContent).catch(() => setContent('_Could not load transcript._'))
  }, [selected])

  if (!live) return <p className="p-2 text-xs text-dim">Connect GitHub to browse meeting transcripts.</p>
  if (!files.length) return <p className="p-2 text-xs text-dim">No meetings on record yet.</p>

  return (
    <div className="grid gap-3 lg:grid-cols-[200px_1fr]">
      <Panel title="Archive" code="TEAM.MTG" accent="#e0408a" bodyClassName="space-y-1 p-2">
        {files.map((f) => (
          <button
            key={f}
            onClick={() => setSelected(f)}
            className={cn(
              'block w-full border-l-2 px-2 py-1.5 text-left text-xs transition-colors',
              f === selected ? 'border-accent bg-accent/5 text-text' : 'border-transparent text-dim hover:text-text',
            )}
          >
            {f.replace('.md', '')}
          </button>
        ))}
      </Panel>
      <Panel title={selected.replace('.md', '')} code="TRANSCRIPT" accent="#e0408a">
        <article className="prose-term">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || 'Loading…'}</ReactMarkdown>
        </article>
      </Panel>
    </div>
  )
}

// ── Token panel ──────────────────────────────────────────────────────────────
function TokenPanel({ onSave, onClose }: { onSave: (t: string) => void; onClose: () => void }) {
  const [show, setShow] = useState(false)
  const [local, setLocal] = useState(() => getToken())
  return (
    <div className="border-b border-line bg-panel/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-dim">
          <Key size={12} /> Connect GitHub
        </span>
        <button onClick={onClose} className="text-dim hover:text-text"><X size={13} /></button>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="github_pat_… (fine-grained, this repo only)"
            className="w-full border border-line bg-bg/60 px-2 py-1.5 pr-8 text-sm text-text focus:border-accent/60 focus:outline-none"
          />
          <button onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-dim hover:text-text">
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <button
          onClick={() => { onSave(local.trim()); onClose() }}
          className="border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs uppercase tracking-wider text-accent hover:bg-accent/20"
        >
          Save
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-dim">
        Create a fine-grained personal access token scoped to this repository only, with
        permissions <span className="text-text/60">Contents: read</span> and{' '}
        <span className="text-text/60">Actions: read &amp; write</span> (the write half powers the
        Approve/Reject buttons). Stored in localStorage only — sent only to api.github.com.
      </p>
    </div>
  )
}
