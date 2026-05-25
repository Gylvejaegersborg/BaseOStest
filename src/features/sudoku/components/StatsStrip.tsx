import { TECHNIQUE_INFO } from '../techniqueInfo'
import type { TechniqueId } from '../engine/types'
import { formatTime } from '../state/useSudokuGame'
import type { SudokuStats } from '../state/useSudokuStats'

export function StatsStrip({ stats }: { stats: SudokuStats }) {
  const topLean = Object.entries(stats.techniqueLeans).sort((a, b) => b[1] - a[1])[0]
  const bestTimes = Object.entries(stats.bestByDifficulty) as [string, number][]
  return (
    <div className="rounded-lg border border-claude-line bg-claude-surface p-4">
      <p className="mb-3 text-[11px] uppercase tracking-wide text-claude-ink-2">Your progress</p>
      <div className="flex items-baseline gap-2">
        <span className="font-claude text-3xl text-claude-ink">{stats.solved}</span>
        <span className="text-sm text-claude-ink-2">puzzles solved</span>
      </div>

      {bestTimes.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
          {bestTimes.map(([d, t]) => (
            <div key={d} className="flex items-center justify-between rounded-md bg-claude-bg/60 px-2 py-1">
              <span className="capitalize text-claude-ink-2">{d}</span>
              <span className="font-claude text-claude-ink">{formatTime(t)}</span>
            </div>
          ))}
        </div>
      )}

      {topLean && (
        <p className="mt-3 text-xs leading-relaxed text-claude-ink-2">
          You ask for help most with{' '}
          <span className="font-medium text-claude-ink">{TECHNIQUE_INFO[topLean[0] as TechniqueId]?.name}</span> — a good
          one to drill in the guide below.
        </p>
      )}
    </div>
  )
}
