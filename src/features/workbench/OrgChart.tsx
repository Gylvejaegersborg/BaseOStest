import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import type { Agent } from '@/data/agents'

/**
 * Reporting lines (agent-os identities' `reportsTo`), as a tree under you.
 * Organizational, not access control: it's where work goes when an agent
 * hands it back, and what each agent is told about its team. Change a
 * line in the agent editor ("Reports to").
 */
export function OrgChart({ agents, onEdit }: { agents: Agent[]; onEdit?: (id: string) => void }) {
  const [open, setOpen] = useState(true)
  const ids = new Set(agents.map((a) => a.id))
  // An agent whose manager isn't in the roster is shown under you.
  const childrenOf = (id: string | undefined) =>
    agents.filter((a) => (id === undefined ? !a.reportsTo || !ids.has(a.reportsTo) : a.reportsTo === id))

  const Node = ({ a, depth, seen }: { a: Agent; depth: number; seen: Set<string> }) => {
    if (seen.has(a.id)) return null
    const next = new Set(seen).add(a.id)
    return (
      <>
        <button
          onClick={() => onEdit?.(a.id)}
          title={onEdit ? `${a.name} — edit to change who they report to` : a.name}
          className="flex w-full items-center gap-1.5 py-0.5 text-left hover:text-accent"
          style={{ paddingLeft: depth * 14 }}
        >
          <span className="text-dim">{depth > 0 ? '└' : ''}</span>
          <StatusDot color={a.color} size={6} />
          <span className="text-text/90">{a.name}</span>
          <span className="truncate text-[10px] text-dim">{a.role}</span>
        </button>
        {childrenOf(a.id).map((c) => (
          <Node key={c.id} a={c} depth={depth + 1} seen={next} />
        ))}
      </>
    )
  }

  return (
    <div className="border border-line p-2">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1 text-left">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="label">Reporting lines</span>
      </button>
      {open && (
        <div className="mt-1.5 space-y-0.5">
          <div className="text-[11px] text-dim">You</div>
          {childrenOf(undefined).map((a) => (
            <Node key={a.id} a={a} depth={1} seen={new Set()} />
          ))}
          <p className="pt-1 text-[10px] text-dim">Hand-backs go up a line; change it in an agent&apos;s editor (Reports to).</p>
        </div>
      )}
    </div>
  )
}
