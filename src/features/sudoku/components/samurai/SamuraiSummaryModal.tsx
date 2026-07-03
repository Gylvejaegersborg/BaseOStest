import { useEffect } from 'react'
import { Award, X } from 'lucide-react'
import { formatTime } from '../../state/useSudokuGame'
import type { SamuraiSummary } from '../../state/useSamuraiGame'

interface SamuraiSummaryModalProps {
  open: boolean
  summary: SamuraiSummary | null
  onClose: () => void
  onPlayAgain: () => void
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-claude-line bg-claude-bg/60 px-3 py-2 text-center">
      <div className="font-claude text-xl text-claude-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-claude-ink-2">{label}</div>
    </div>
  )
}

export function SamuraiSummaryModal({ open, summary, onClose, onPlayAgain }: SamuraiSummaryModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !summary) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-claude-line bg-claude-surface font-sans text-claude-ink shadow-[0_12px_50px_rgba(31,30,28,0.30)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-claude-line px-5 py-4">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-claude-clay" />
            <h2 className="font-claude text-xl font-medium">Samurai complete</h2>
          </div>
          <button type="button" onClick={onClose} className="text-claude-ink-2 hover:text-claude-ink">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="mb-3 text-sm text-claude-ink-2">
            All five grids solved on <span className="text-claude-ink">{summary.difficulty}</span>.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Time" value={formatTime(summary.timeSec)} />
            <Stat label="Hints" value={String(summary.hintsUsed)} />
            <Stat label="Wrong" value={String(summary.wrongChecks)} />
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-claude-line px-5 py-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-md bg-claude-clay px-4 py-2 text-sm text-claude-surface transition-colors hover:bg-claude-clay/90"
          >
            Play again
          </button>
        </div>
      </div>
    </div>
  )
}
