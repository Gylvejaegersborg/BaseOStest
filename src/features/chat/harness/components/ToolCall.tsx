import { Wrench } from 'lucide-react'
import type { ToolCallItem, ToolResultItem } from '../protocol'

export function ToolCall({ item }: { item: ToolCallItem }) {
  return (
    <div className="flex items-start gap-2 rounded border border-line bg-panel-2 px-3 py-2 text-xs">
      <Wrench size={13} className="mt-0.5 shrink-0 text-dim" />
      <div className="min-w-0">
        <div className="font-mono text-accent">{item.tool}</div>
        {Object.keys(item.args).length > 0 && (
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] text-dim">
            {JSON.stringify(item.args, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

export function ToolResult({ item }: { item: ToolResultItem }) {
  return (
    <div
      className={
        'rounded border px-3 py-2 text-xs font-mono ' +
        (item.ok ? 'border-line bg-panel-2 text-dim' : 'border-danger/40 bg-danger/10 text-danger')
      }
    >
      {item.tool && <div className="mb-1 text-[10px] uppercase tracking-wider text-dim">{item.tool}</div>}
      <pre className="whitespace-pre-wrap break-all">{item.ok ? item.output : item.error ?? item.output}</pre>
    </div>
  )
}
