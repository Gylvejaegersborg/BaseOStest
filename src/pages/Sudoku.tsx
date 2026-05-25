import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause } from 'lucide-react'
import { colOf, rowOf } from '../features/sudoku/engine/grid'
import { Board } from '../features/sudoku/components/Board'
import { Controls } from '../features/sudoku/components/Controls'
import { HintPanel } from '../features/sudoku/components/HintPanel'
import { NumberPad } from '../features/sudoku/components/NumberPad'
import { StatsStrip } from '../features/sudoku/components/StatsStrip'
import { SummaryModal } from '../features/sudoku/components/SummaryModal'
import { TechniqueGuide } from '../features/sudoku/components/TechniqueGuide'
import { TipToast } from '../features/sudoku/components/TipToast'
import { useSudokuGame, type RoundSummary } from '../features/sudoku/state/useSudokuGame'
import { useSudokuStats } from '../features/sudoku/state/useSudokuStats'

export function Sudoku() {
  const game = useSudokuGame('easy')
  const { stats, recordRound, priorAvgHints } = useSudokuStats()
  const [summaryOpen, setSummaryOpen] = useState(false)
  const recorded = useRef<RoundSummary | null>(null)

  const gameRef = useRef(game)
  gameRef.current = game

  // Record a finished round once, and surface the report.
  useEffect(() => {
    if (game.summary && game.summary !== recorded.current) {
      recorded.current = game.summary
      recordRound({
        difficulty: game.summary.difficulty,
        timeSec: game.summary.timeSec,
        hintsTotal: game.summary.hintsTotal,
        conflicts: game.summary.conflicts,
        wrongChecks: game.summary.wrongChecks,
        hintsByTechnique: game.summary.hintsByTechnique,
        completedAt: Date.now(),
      })
      setSummaryOpen(true)
    }
  }, [game.summary, recordRound])

  // Keyboard play.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const g = gameRef.current
      if (g.status !== 'playing' || g.generating || g.paused) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key >= '1' && e.key <= '9') {
        g.setDigit(Number(e.key))
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        g.erase()
      } else if (e.key === 'n' || e.key === 'N') {
        g.toggleNotesMode()
      } else if (e.key === 'h' || e.key === 'H') {
        g.requestHint()
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        const cur = g.selected ?? 0
        let r = rowOf(cur)
        let c = colOf(cur)
        if (e.key === 'ArrowUp') r = (r + 8) % 9
        else if (e.key === 'ArrowDown') r = (r + 1) % 9
        else if (e.key === 'ArrowLeft') c = (c + 8) % 9
        else if (e.key === 'ArrowRight') c = (c + 1) % 9
        g.select(r * 9 + c)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const highlights = useMemo(() => new Set(game.hint?.highlights ?? []), [game.hint])

  return (
    <div className="h-full overflow-y-auto bg-claude-bg font-sans text-claude-ink">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
        <header className="mb-6">
          <h1 className="font-claude text-3xl font-medium text-claude-ink">Sudoku</h1>
          <p className="mt-1 text-sm text-claude-ink-2">
            A calm place to get better — every hint teaches the next logical step, and each round ends with what to
            work on.
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Board column */}
          <div className="flex flex-col items-center gap-4">
            <Controls
              difficulty={game.difficulty}
              elapsed={game.elapsed}
              paused={game.paused}
              canUndo={game.canUndo}
              generating={game.generating}
              onNewGame={game.newGame}
              onCheck={game.check}
              onUndo={game.undo}
              onTogglePause={game.togglePause}
              onAutoPencil={game.autoPencil}
            />

            <div className="relative">
              <Board game={game} highlights={highlights} />
              {(game.paused || game.generating) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-claude-surface/90 backdrop-blur-sm">
                  <Pause size={28} className="text-claude-clay" />
                  <span className="font-claude text-lg text-claude-ink">
                    {game.generating ? 'Dealing a fresh grid…' : 'Paused'}
                  </span>
                </div>
              )}
            </div>

            <NumberPad
              remaining={game.remaining}
              notesMode={game.notesMode}
              disabled={game.status !== 'playing' || game.paused}
              onDigit={game.setDigit}
              onErase={game.erase}
              onToggleNotes={game.toggleNotesMode}
            />
            <p className="text-center text-xs text-claude-ink-2">
              Keys: 1–9 place · 0/⌫ erase · N notes · H hint · arrows move
            </p>
          </div>

          {/* Coaching column */}
          <div className="flex flex-1 flex-col gap-4">
            <HintPanel
              hint={game.hint}
              onRequest={game.requestHint}
              onApply={game.applyHint}
              onDismiss={game.dismissHint}
            />
            <StatsStrip stats={stats} />
            <TechniqueGuide />
          </div>
        </div>
      </div>

      <TipToast
        tip={game.idleTip}
        onMoreHelp={() => {
          game.dismissIdleTip()
          game.requestHint()
        }}
        onDismiss={game.dismissIdleTip}
      />

      <SummaryModal
        open={summaryOpen}
        summary={game.summary}
        priorAvgHints={priorAvgHints()}
        solved={stats.solved}
        onClose={() => setSummaryOpen(false)}
        onPlayAgain={() => {
          setSummaryOpen(false)
          game.newGame(game.difficulty)
        }}
      />
    </div>
  )
}
