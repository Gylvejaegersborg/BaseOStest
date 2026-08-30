import { Wrench } from 'lucide-react'

/** Placeholder Tools view — generic Tool View renderer (JSON/diff/image/
 *  markdown/browser/terminal/file, per plan §41-42, §69) opens per-tool
 *  once real tool.started events carry a renderer hint from the Gateway. */
export function ToolsPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-dim">
      <Wrench size={28} className="opacity-40" />
      <div className="text-xs italic">Tool views open here automatically once tools run live.</div>
    </div>
  )
}
