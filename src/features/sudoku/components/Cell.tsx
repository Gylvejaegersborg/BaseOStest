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
        'relative flex aspect-square select-none items-center justify-center border border-claude-line transition-colors',
        col % 3 === 2 && col !== 8 && 'border-r-2 border-r-claude-ink/40',
        row % 3 === 2 && row !== 8 && 'border-b-2 border-b-claude-ink/40',
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
