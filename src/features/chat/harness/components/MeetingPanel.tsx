import { Landmark } from 'lucide-react'

/** Placeholder — real Meeting mode (multi-agent shared session +
 *  shared workspace, per plan §35-39) lands in Phase 13. */
export function MeetingPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-dim">
      <Landmark size={28} className="opacity-40" />
      <div className="text-xs italic">Meeting mode — multi-agent shared sessions land in Phase 13.</div>
    </div>
  )
}
