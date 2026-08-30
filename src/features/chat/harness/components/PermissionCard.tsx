import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { PermissionItem } from '../protocol'

const RISK_COLOR: Record<string, string> = {
  low: '#46d369',
  medium: '#f0a020',
  high: '#ff5566',
}

const OPTION_LABEL: Record<string, string> = {
  once: 'Allow once',
  always: 'Always',
  deny: 'Deny',
}

export function PermissionCard({ item }: { item: PermissionItem }) {
  const [resolved, setResolved] = useState<string | null>(null)
  const { request } = item

  return (
    <div className="rounded border border-amber/40 bg-amber/5 px-3 py-2.5 text-xs">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber">
        <ShieldAlert size={12} />
        Permission required
        <span className="ml-auto rounded px-1.5 py-0.5 text-[9px]" style={{ color: RISK_COLOR[request.risk], border: `1px solid ${RISK_COLOR[request.risk]}55` }}>
          {request.risk} risk
        </span>
      </div>
      <div className="text-text">
        <span className="text-dim">{item.agentId ?? 'Agent'} wants to run </span>
        <span className="font-mono text-accent">{request.tool}</span>
      </div>
      {Object.keys(request.payload).length > 0 && (
        <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-all rounded bg-panel-2 px-2 py-1 font-mono text-[10px] text-dim">
          {JSON.stringify(request.payload, null, 2)}
        </pre>
      )}
      <div className="mt-2 flex gap-1.5">
        {request.options.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={resolved !== null}
            onClick={() => setResolved(opt)}
            className={cn(
              'rounded border px-2.5 py-1 text-[10px] font-medium transition-colors',
              opt === 'deny'
                ? 'border-danger/40 text-danger hover:bg-danger/10'
                : 'border-line-2 text-text hover:bg-panel-2',
              resolved !== null && resolved !== opt && 'opacity-30',
              resolved === opt && 'bg-panel-2',
            )}
          >
            {OPTION_LABEL[opt]}
          </button>
        ))}
      </div>
      {resolved && (
        <div className="mt-1.5 text-[10px] text-dim">
          Resolved: {OPTION_LABEL[resolved]}
          <span className="ml-1 italic">(local only — wiring to permission.resolve lands in Phase 10)</span>
        </div>
      )}
    </div>
  )
}
