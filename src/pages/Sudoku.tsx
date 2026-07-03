import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Swords } from 'lucide-react'
import { cn } from '@/lib/cn'
import { colOf, rowOf } from '../features/sudoku/engine/grid'
import {
  SIZE as SAMURAI_SIZE,
  colOf as samuraiColOf,
  isActive as samuraiIsActive,
  rowOf as samuraiRowOf,
} from '../features/sudoku/engine/samurai/geometry'
import { Board } from '../features/sudoku/components/Board'
import { Controls } from '../features/sudoku/components/Controls'
import { HintPanel } from '../features/sudoku/components/HintPanel'
import { NumberPad } from '../features/sudoku/components/NumberPad'
import { SamuraiBoard } from '../features/sudoku/components/samurai/SamuraiBoard'
import { SamuraiControls } from '../features/sudoku/components/samurai/SamuraiControls'
import { SamuraiNumberPad } from '../features/sudoku/components/samurai/SamuraiNumberPad'
import { SamuraiSummaryModal } from '../features/sudoku/components/samurai/SamuraiSummaryModal'
import { StatsStrip } from '../features/sudoku/components/StatsStrip'
import { SummaryModal } from '../features/sudoku/components/SummaryModal'
import { TechniqueGuide } from '../features/sudoku/components/TechniqueGuide'
import { TipToast } from '../features/sudoku/components/TipToast'
import { useSamuraiGame } from '../features/sudoku/state/useSamuraiGame'
import { useSudokuGame, type RoundSummary } from '../features/sudoku/state/useSudokuGame'
import { useSudokuStats } from '../features/sudoku/state/useSudokuStats'

type Mode = 'classic' | 'samurai'

export function Sudoku() {
  const [mode, setMode] = useState<Mode>('classic')
  const game = useSudokuGame('easy')
  const samurai = useSamuraiGame('easy')
  const { stats, recordRound, priorAvgHints } = useSudokuStats()
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [samuraiSummaryOpen, setSamuraiSummaryOpen] = useState(false)
  const recorded = useRef<RoundSummary | null>(null)
  const samuraiRecorded = useRef(samurai.summary)

  const gameRef = useRef(game)
  gameRef.current = game
  const samuraiRef = useRef(samurai)
  samuraiRef.current = samurai

  // Pause whichever mode's board isn't on screen so its timer doesn't run in the background.
  useEffect(() => {
    if (mode === 'samurai' && game.status === 'playing' && !game.paused) game.togglePause()
    if (mode === 'classic' && samurai.status === 'playing' && !samurai.paused) samurai.togglePause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    if (samurai.summary && samurai.summary !== samuraiRecorded.current) {
      samuraiRecorded.current = samurai.summary
      setSamuraiSummaryOpen(true)
    }
  }, [samurai.summary])

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
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (mode === 'samurai') {
        const g = samuraiRef.current
        if (g.status !== 'playing' || g.generating || g.paused) return
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
          let r = samuraiRowOf(cur)
          let c = samuraiColOf(cur)
          for (let step = 0; step < SAMURAI_SIZE; step++) {
            if (e.key === 'ArrowUp') r = (r + SAMURAI_SIZE - 1) % SAMURAI_SIZE
            else if (e.key === 'ArrowDown') r = (r + 1) % SAMURAI_SIZE
            else if (e.key === 'ArrowLeft') c = (c + SAMURAI_SIZE - 1) % SAMURAI_SIZE
            else if (e.key === 'ArrowRight') c = (c + 1) % SAMURAI_SIZE
            if (samuraiIsActive(r, c)) break
          }
          g.select(r * SAMURAI_SIZE + c)
        }
        return
      }

      const g = gameRef.current
      if (g.status !== 'playing' || g.generating || g.paused) return
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
  }, [mode])

  const highlights = useMemo(() => new Set(game.hint?.highlights ?? []), [game.hint])

  return (
    <div className="h-full overflow-y-auto bg-claude-bg font-sans text-claude-ink">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-claude text-3xl font-medium text-claude-ink">Sudoku</h1>
            <p className="mt-1 text-sm text-claude-ink-2">
              {mode === 'classic'
                ? 'A calm place to get better — every hint teaches the next logical step, and each round ends with what to work on.'
                : 'Five overlapping 9x9 grids sharing four corner boxes. Solve all five as one connected puzzle.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'classic' ? 'samurai' : 'classic'))}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
              mode === 'samurai'
                ? 'border-claude-clay bg-claude-clay text-claude-surface'
                : 'border-claude-line bg-claude-surface text-claude-ink hover:border-claude-clay hover:bg-claude-clay-soft/40',
            )}
          >
            <Swords size={15} /> {mode === 'classic' ? 'Samurai mode' : 'Classic mode'}
          </button>
        </header>

        {mode === 'classic' ? (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Board column */}
            <div className="flex w-full flex-col items-center gap-4 lg:w-[clamp(17rem,38vw,30rem)] lg:shrink-0">
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

              <div className="relative w-full">
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
        ) : (
          <div className="flex w-full flex-col items-center gap-4">
            <SamuraiControls
              difficulty={samurai.difficulty}
              elapsed={samurai.elapsed}
              paused={samurai.paused}
              canUndo={samurai.canUndo}
              generating={samurai.generating}
              onNewGame={samurai.newGame}
              onCheck={samurai.check}
              onUndo={samurai.undo}
              onTogglePause={samurai.togglePause}
              onAutoPencil={samurai.autoPencil}
              onHint={samurai.requestHint}
            />

            <div className="relative w-full max-w-[min(96vw,44rem)]">
              <SamuraiBoard game={samurai} />
              {(samurai.paused || samurai.generating) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-claude-surface/90 backdrop-blur-sm">
                  <Pause size={28} className="text-claude-clay" />
                  <span className="font-claude text-lg text-claude-ink">
                    {samurai.generating ? 'Dealing five fresh grids…' : 'Paused'}
                  </span>
                </div>
              )}
            </div>

            <SamuraiNumberPad
              notesMode={samurai.notesMode}
              disabled={samurai.status !== 'playing' || samurai.paused}
              onDigit={samurai.setDigit}
              onErase={samurai.erase}
              onToggleNotes={samurai.toggleNotesMode}
            />
            <p className="text-center text-xs text-claude-ink-2">
              Keys: 1–9 place · 0/⌫ erase · N notes · H hint · arrows move
            </p>
          </div>
        )}
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

      <SamuraiSummaryModal
        open={samuraiSummaryOpen}
        summary={samurai.summary}
        onClose={() => setSamuraiSummaryOpen(false)}
        onPlayAgain={() => {
          setSamuraiSummaryOpen(false)
          samurai.newGame(samurai.difficulty)
        }}
      />
    </div>
  )
}
