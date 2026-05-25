import { useEffect } from 'react'
import { Award, Lightbulb, TrendingDown, TrendingUp, X } from 'lucide-react'
import { TECHNIQUE_INFO } from '../techniqueInfo'
import type { TechniqueId } from '../engine/types'
import { formatTime, type RoundSummary } from '../state/useSudokuGame'

interface SummaryModalProps {
  open: boolean
  summary: RoundSummary | null
  priorAvgHints: number | null
  solved: number
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

export function SummaryModal({ open, summary, priorAvgHints, solved, onClose, onPlayAgain }: SummaryModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !summary) return null

  const trend =
    priorAvgHints === null ? null : summary.hintsTotal <= priorAvgHints ? 'down' : 'up'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-claude-line bg-claude-surface font-sans text-claude-ink shadow-[0_12px_50px_rgba(31,30,28,0.30)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-claude-line px-5 py-4">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-claude-clay" />
            <h2 className="font-claude text-xl font-medium">Round complete</h2>
          </div>
          <button type="button" onClick={onClose} className="text-claude-ink-2 hover:text-claude-ink">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Time" value={formatTime(summary.timeSec)} />
            <Stat label="Hints" value={String(summary.hintsTotal)} />
            <Stat label="Conflicts" value={String(summary.conflicts)} />
            <Stat label="Wrong" value={String(summary.wrongChecks)} />
          </div>

          {trend && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-claude-line bg-claude-bg/60 px-3 py-2 text-sm">
              {trend === 'down' ? (
                <TrendingDown size={16} className="text-claude-sage" />
              ) : (
                <TrendingUp size={16} className="text-claude-clay" />
              )}
              <span className="text-claude-ink-2">
                {trend === 'down'
                  ? `Fewer hints than your recent average (${priorAvgHints!.toFixed(1)}). You're leaning on the coach less — that's progress.`
                  : `A few more hints than your recent average (${priorAvgHints!.toFixed(1)}). Worth a rematch at this level.`}
              </span>
            </div>
          )}

          {summary.requiredTechniques.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-claude-ink-2">Techniques this puzzle needed</p>
              <div className="flex flex-wrap gap-1.5">
                {[...summary.requiredTechniques]
                  .sort((a, b) => TECHNIQUE_INFO[a].tier - TECHNIQUE_INFO[b].tier)
                  .map((t: TechniqueId) => (
                    <span
                      key={t}
                      className="rounded-full border border-claude-line bg-claude-bg/70 px-2.5 py-0.5 text-xs text-claude-ink"
                    >
                      {TECHNIQUE_INFO[t].name}
                    </span>
                  ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-claude-ink-2">
              <Lightbulb size={13} className="text-claude-clay" /> What to work on
            </p>
            <ul className="space-y-2">
              {summary.tips.map((tip, i) => (
                <li
                  key={i}
                  className="rounded-md border-l-2 border-claude-clay bg-claude-bg/50 px-3 py-2 text-sm leading-relaxed text-claude-ink"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-claude-line px-5 py-3">
          <span className="text-xs text-claude-ink-2">{solved} solved all-time</span>
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
