import { FileText, Code, Image, Database, ClipboardList, FileEdit, File } from 'lucide-react'
import { useAgentOsArtifacts } from '@/features/agentos/useAgentOsArtifacts'
import type { AgentOsArtifactType } from '@/features/agentos/sessionClient'

const TYPE_ICON: Record<AgentOsArtifactType, typeof FileText> = {
  code: Code,
  file: File,
  report: FileText,
  image: Image,
  dataset: Database,
  plan: ClipboardList,
  draft: FileEdit,
  other: File,
}

/** Real Agent-OS Artifacts — produced outputs attached via the opt-in
 * record-artifact tool — filtered to the selected agent's own work when
 * one is chosen. `location` is just a string the producer chose (a path
 * or URL, see artifacts.ts) — shown as-is, opened as a link only when it
 * looks like one. */
export function ArtifactsTab({ agentId }: { agentId: string | null }) {
  const { artifacts, loading, error } = useAgentOsArtifacts(agentId ? { producer: agentId } : {})

  if (loading) return <p className="p-3 text-xs text-dim">Loading artifacts…</p>
  if (error) return <p className="p-3 text-xs text-danger">{error}</p>
  if (!artifacts.length) return <p className="p-3 text-xs text-dim">No artifacts{agentId ? ' from this agent' : ''} yet.</p>

  return (
    <div className="divide-y divide-line/60">
      {artifacts
        .slice()
        .reverse()
        .map((a) => {
          const Icon = TYPE_ICON[a.type]
          const isUrl = /^https?:\/\//.test(a.location)
          return (
            <div key={a.id} className="flex items-center gap-2 px-3 py-2 text-xs">
              <Icon size={13} className="shrink-0 text-accent" />
              <span className="text-dim">{a.type}</span>
              {isUrl ? (
                <a href={a.location} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-accent hover:underline">
                  {a.location}
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate text-text/80">{a.location}</span>
              )}
              <span className="shrink-0 text-[10px] text-dim">{a.producer}</span>
            </div>
          )
        })}
    </div>
  )
}
