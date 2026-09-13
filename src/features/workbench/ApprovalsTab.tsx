import { ThumbsUp, ThumbsDown, FileEdit, FilePlus } from 'lucide-react'
import { AGENTS } from '@/data/agents'
import { useAgentOsApprovals } from '@/features/agentos/useAgentOsApprovals'
import type { AgentOsApproval } from '@/features/agentos/sessionClient'

function agentColor(id: string): string {
  return AGENTS.find((a) => a.id === id)?.color ?? '#6b7785'
}

function agentName(id: string): string {
  return AGENTS.find((a) => a.id === id)?.name ?? id
}

const MAX_DIFF_CHARS = 4000

/** edit_file's whole call IS the diff — {old_string, new_string} needs no
 * computed line-matching, just a removed/added block each, the same shape
 * Claude Code/Codex render for a structured edit. write_file has no
 * "before" content available here (nothing proactively reads the file
 * just to build a preview), so it's shown as a flat "new content" block
 * instead of a diff. Caps each side so one huge edit doesn't blow out the
 * Approvals panel — this is a review surface, not a full file viewer. */
function ToolCallPreview({ approval }: { approval: AgentOsApproval }) {
  const { toolName, args } = approval

  if (toolName === 'edit_file' && typeof args.old_string === 'string' && typeof args.new_string === 'string') {
    const oldStr = args.old_string.slice(0, MAX_DIFF_CHARS)
    const newStr = args.new_string.slice(0, MAX_DIFF_CHARS)
    return (
      <div className="mb-1.5">
        {typeof args.path === 'string' && (
          <div className="mb-1 flex items-center gap-1.5 text-[10px] text-dim">
            <FileEdit size={11} /> <code className="text-text/80">{args.path}</code>
            {args.replace_all === true && <span className="rounded-sm bg-panel-2 px-1 text-[9px] uppercase tracking-wider">all occurrences</span>}
          </div>
        )}
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words border border-line bg-bg/60 p-1.5 text-[11px]">
          {oldStr.split('\n').map((line, i) => (
            <div key={`old-${i}`} className="bg-danger/10 text-danger">
              − {line}
            </div>
          ))}
          {newStr.split('\n').map((line, i) => (
            <div key={`new-${i}`} style={{ backgroundColor: '#46d36915', color: '#46d369' }}>
              + {line}
            </div>
          ))}
        </pre>
      </div>
    )
  }

  if (toolName === 'write_file' && typeof args.content === 'string') {
    const content = args.content.slice(0, MAX_DIFF_CHARS)
    return (
      <div className="mb-1.5">
        {typeof args.path === 'string' && (
          <div className="mb-1 flex items-center gap-1.5 text-[10px] text-dim">
            <FilePlus size={11} /> <code className="text-text/80">{args.path}</code>
            <span className="rounded-sm bg-panel-2 px-1 text-[9px] uppercase tracking-wider">new content</span>
          </div>
        )}
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words border border-line bg-bg/60 p-1.5 text-[11px]" style={{ color: '#46d369' }}>
          {content
            .split('\n')
            .map((line, i) => (
              <div key={i}>+ {line}</div>
            ))}
        </pre>
      </div>
    )
  }

  if (typeof args.command === 'string') {
    return <code className="mb-1.5 block max-w-full overflow-x-auto whitespace-pre text-[11px] text-text/85">{args.command}</code>
  }

  return null
}

/** Real, durable Agent-OS tool-execution approvals — moved here from
 * Team.tsx (which previously showed it alongside the unrelated
 * GitHub-workflow content-publish queue). Unfiltered by the selected
 * agent: a pending approval needs attention regardless of which agent
 * you happen to be looking at in the conversation pane. */
export function ApprovalsTab() {
  const { connection, approvals, busyId, error, act } = useAgentOsApprovals()

  if (connection === 'unconfigured') {
    return <p className="p-3 text-xs text-dim">No Agent-OS gateway configured.</p>
  }
  if (connection === 'connecting') return <p className="p-3 text-xs text-dim">Connecting…</p>
  if (connection === 'error') {
    return <p className="p-3 text-xs text-danger">Agent-OS gateway unreachable{error ? `: ${error}` : ''}.</p>
  }

  return (
    <div className="p-2">
      {error && <p className="mb-2 border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}
      {!approvals.length && (
        <p className="p-2 text-xs text-dim">
          No tool-execution approvals pending. These appear when an agent's permission policy requires a human to say yes before a command runs.
        </p>
      )}
      <div className="space-y-2">
        {approvals.map((a) => (
          <div key={a.id} className="border border-line bg-bg/40 p-2">
            <div className="mb-1 flex items-center gap-2 text-[10px] text-dim">
              <span style={{ color: agentColor(a.agentId) }}>{agentName(a.agentId)}</span>
              <span>wants to run</span>
              <code className="text-text/80">{a.toolName}</code>
              <span>· {new Date(a.requestedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <ToolCallPreview approval={a} />
            <p className="mb-2 text-[11px] text-dim">{a.reason}</p>
            <div className="flex gap-2">
              <button
                onClick={() => act(a.id, 'approve')}
                disabled={busyId === a.id}
                className="flex items-center gap-1.5 border px-3 py-1.5 text-xs uppercase tracking-wider disabled:opacity-50"
                style={{ borderColor: '#46d36966', color: '#46d369', backgroundColor: '#46d36915' }}
              >
                <ThumbsUp size={13} /> Approve
              </button>
              <button
                onClick={() => act(a.id, 'reject')}
                disabled={busyId === a.id}
                className="flex items-center gap-1.5 border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs uppercase tracking-wider text-danger hover:bg-danger/20 disabled:opacity-50"
              >
                <ThumbsDown size={13} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
