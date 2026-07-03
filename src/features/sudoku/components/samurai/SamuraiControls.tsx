import { Check, Lightbulb, Pause, Play, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { SamuraiDifficulty } from '../../engine/samurai/generator'
import { formatTime } from '../../state/useSudokuGame'

const DIFFICULTIES: SamuraiDifficulty[] = ['easy', 'medium', 'hard']

const iconBtn =
  'flex items-center justify-center gap-1.5 rounded-md border border-claude-line bg-claude-surface px-3 py-1.5 text-sm text-claude-ink transition-colors hover:border-claude-clay hover:bg-claude-clay-soft/40 disabled:cursor-default disabled:opacity-40 disabled:hover:border-claude-line disabled:hover:bg-claude-surface'

interface SamuraiControlsProps {
  difficulty: SamuraiDifficulty
  elapsed: number
  paused: boolean
  canUndo: boolean
  generating: boolean
  onNewGame: (d: SamuraiDifficulty) => void
  onCheck: () => void
  onUndo: () => void
  onTogglePause: () => void
  onAutoPencil: () => void
  onHint: () => void
}

export function SamuraiControls(props: SamuraiControlsProps) {
  const { difficulty, elapsed, paused, canUndo, generating, onNewGame, onCheck, onUndo, onTogglePause, onAutoPencil, onHint } =
    props
  return (
    <div className="w-full max-w-[min(96vw,44rem)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex overflow-hidden rounded-md border border-claude-line">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onNewGame(d)}
              className={cn(
                'px-3 py-1.5 text-xs uppercase tracking-wide transition-colors',
                d === difficulty
                  ? 'bg-claude-clay text-claude-surface'
                  : 'bg-claude-surface text-claude-ink-2 hover:bg-claude-clay-soft/40',
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-claude text-lg tabular-nums text-claude-ink">{formatTime(elapsed)}</span>
          <button type="button" onClick={onTogglePause} className={iconBtn} aria-label={paused ? 'Resume' : 'Pause'}>
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onNewGame(difficulty)} disabled={generating} className={iconBtn}>
          <RotateCcw size={15} /> New
        </button>
        <button type="button" onClick={onCheck} className={iconBtn}>
          <Check size={15} /> Check
        </button>
        <button type="button" onClick={onUndo} disabled={!canUndo} className={iconBtn}>
          <Undo2 size={15} /> Undo
        </button>
        <button type="button" onClick={onAutoPencil} className={iconBtn}>
          <Sparkles size={15} /> Auto-pencil
        </button>
        <button type="button" onClick={onHint} className={iconBtn}>
          <Lightbulb size={15} /> Hint
        </button>
      </div>
    </div>
  )
}
