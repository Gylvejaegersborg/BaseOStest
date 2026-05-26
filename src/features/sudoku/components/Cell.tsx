import { cn } from '@/lib/cn'

export interface CellProps {
  value: number
  notes: number[]
  given: boolean
  selected: boolean
  peer: boolean
  sameValue: boolean
  conflict: boolean
  wrong: boolean
  hintEvidence: boolean
  row: number
  col: number
  onClick: () => void
}

export function Cell(props: CellProps) {
  const { value, notes, given, selected, peer, sameValue, conflict, wrong, hintEvidence, row, col, onClick } = props
  const bad = conflict || wrong
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex select-none items-center justify-center transition-colors',
        // Grid lines: draw top + left only so adjacent cells never double up.
        // Box dividers (every third line) match the outer frame's 2px weight.
        col !== 0 && (col % 3 === 0 ? 'border-l-2 border-l-claude-ink/40' : 'border-l border-l-claude-line'),
        row !== 0 && (row % 3 === 0 ? 'border-t-2 border-t-claude-ink/40' : 'border-t border-t-claude-line'),
        peer && !selected && 'bg-claude-bg',
        sameValue && !selected && 'bg-claude-sage/20',
        hintEvidence && !selected && 'bg-claude-clay-soft/60',
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
          style={{ fontSize: 'clamp(1rem, 4.4vw, 1.55rem)' }}
        >
          {value}
        </span>
      ) : (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 p-[2px] text-claude-ink-2">
          {Array.from({ length: 9 }, (_, k) => (
            <span
              key={k}
              className="flex items-center justify-center leading-none"
              style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.62rem)' }}
            >
              {notes.includes(k + 1) ? k + 1 : ''}
            </span>
          ))}
        </div>
      )}
      {hintEvidence && (
        <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-claude-clay" />
      )}
    </button>
  )
}
