import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, FileEdit, FilePlus, History } from 'lucide-react'
import { fetchFileRevisions, restoreFileRevision, type AgentOsFileRevision } from '@/features/agentos/sessionClient'

const TOOL_ICON: Record<AgentOsFileRevision['tool'], typeof FileEdit> = {
  edit_file: FileEdit,
  write_file: FilePlus,
  restore: RotateCcw,
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/**
 * Per-file undo — agent-os's file-revisions.ts, a scoped-down
 * "checkpoint" that undoes one file's edit_file/write_file mutations,
 * NOT a full session rewind. Unfiltered by the selected agent: a file
 * change needs review regardless of which agent's conversation you
 * happen to be looking at (in practice, only the Engineer agent can
 * ever produce one — see gateway/cli.ts's FILESYSTEM_TOOLS restriction
 * — but this tab doesn't assume that won't change).
 */
export function FileRevisionsTab() {
  const [revisions, setRevisions] = useState<AgentOsFileRevision[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setRevisions(await fetchFileRevisions())
      setError('')
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not load file revisions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const restore = async (id: string) => {
    setBusyId(id)
    try {
      await restoreFileRevision(id)
      await refresh()
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not restore that revision')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p className="p-3 text-xs text-dim">Loading…</p>

  return (
    <div className="p-2">
      <p className="mb-2 px-1 text-[11px] text-dim">
        Every edit_file/write_file mutation, most recent first. Restoring puts the file back exactly as it was before that change — and is itself
        undoable.
      </p>
      {error && <p className="mb-2 border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}
      {!revisions.length && (
        <p className="flex items-center gap-2 border border-line bg-bg/20 p-2 text-[11px] text-dim">
          <History size={13} /> No file changes recorded yet.
        </p>
      )}
      <div className="space-y-1.5">
        {revisions.map((r) => {
          const Icon = TOOL_ICON[r.tool]
          return (
            <div key={r.id} className="flex items-start gap-2 border border-line bg-bg/40 p-2">
              <Icon size={13} className="mt-0.5 shrink-0 text-dim" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px]">
                  <code className="min-w-0 truncate text-text/85">{r.path}</code>
                  <span className="shrink-0 rounded-sm bg-panel-2 px-1 text-[9px] uppercase tracking-wider text-dim">{r.tool}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-dim">
                  {timeAgo(r.timestamp)} · {r.existedBefore ? 'had existing content' : 'file did not exist before this'}
                </div>
              </div>
              <button
                onClick={() => restore(r.id)}
                disabled={busyId === r.id}
                title="Restore to how this file looked before this change"
                className="flex shrink-0 items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-text/80 hover:border-accent/60 hover:text-accent disabled:opacity-40"
              >
                <RotateCcw size={11} /> Restore
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
