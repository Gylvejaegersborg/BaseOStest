import { cn } from '@/lib/cn'
import { isActive } from '../../engine/samurai/geometry'

export interface SamuraiCellProps {
  value: number
  notes: number[]
  given: boolean
  selected: boolean
  peer: boolean
  sameValue: boolean
  conflict: boolean
  wrong: boolean
  isHint: boolean
  row: number
  col: number
  onClick: () => void
}

/**
 * A cell in the 21x21 master grid. Unlike the single-board Cell, borders are drawn on
 * all four sides so the irregular cross-shaped perimeter (five overlapping 9x9 grids)
 * closes cleanly even where a neighboring cell doesn't exist.
 */
export function SamuraiCell(props: SamuraiCellProps) {
  const { value, notes, given, selected, peer, sameValue, conflict, wrong, isHint, row, col, onClick } = props
  const bad = conflict || wrong
  const thickLeft = col % 3 === 0 || !isActive(row, col - 1)
  const thickTop = row % 3 === 0 || !isActive(row - 1, col)
  const thickRight = !isActive(row, col + 1)
  const thickBottom = !isActive(row + 1, col)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex min-h-0 min-w-0 select-none items-center justify-center overflow-hidden transition-colors',
        thickLeft ? 'border-l-2 border-l-claude-ink/40' : 'border-l border-l-claude-line',
        thickTop ? 'border-t-2 border-t-claude-ink/40' : 'border-t border-t-claude-line',
        thickRight && 'border-r-2 border-r-claude-ink/40',
        thickBottom && 'border-b-2 border-b-claude-ink/40',
        peer && !selected && 'bg-claude-bg',
        sameValue && !selected && 'bg-claude-sage/20',
        isHint && !selected && 'bg-claude-clay-soft/60',
        wrong && 'bg-[#F3D9CF]',
        selected && 'bg-claude-clay-soft',
      )}
    >
      {value !== 0 ? (
        <span
          className={cn(
            'font-claude leading-none',
            given ? 'font-semibold text-claude-ink' : 'font-medium text-claude-sky',
            bad && 'font-semibold text-[#B5462F]',
          )}
          style={{ fontSize: 'clamp(0.55rem, 1.9vw, 0.95rem)' }}
        >
          {value}
        </span>
      ) : (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 p-[1px] text-claude-ink-2">
          {Array.from({ length: 9 }, (_, k) => (
            <span
              key={k}
              className="flex items-center justify-center leading-none"
              style={{ fontSize: 'clamp(0.24rem, 0.75vw, 0.36rem)' }}
            >
              {notes.includes(k + 1) ? k + 1 : ''}
            </span>
          ))}
        </div>
      )}
      {isHint && <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-claude-clay" />}
    </button>
  )
}
