import { Eraser, Pencil } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SamuraiNumberPadProps {
  notesMode: boolean
  disabled: boolean
  onDigit: (d: number) => void
  onErase: () => void
  onToggleNotes: () => void
}

/**
 * Same layout as the classic NumberPad, minus the per-digit "remaining" count — with
 * five overlapping grids a digit's global remaining count isn't a meaningful number.
 */
export function SamuraiNumberPad({ notesMode, disabled, onDigit, onErase, onToggleNotes }: SamuraiNumberPadProps) {
  return (
    <div className="w-full max-w-[min(96vw,44rem)]">
      <div className="grid grid-cols-9 gap-1.5">
        {Array.from({ length: 9 }, (_, k) => {
          const d = k + 1
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => onDigit(d)}
              className={cn(
                'aspect-square rounded-md border border-claude-line bg-claude-surface font-claude text-lg text-claude-ink transition-colors',
                'hover:border-claude-clay hover:bg-claude-clay-soft/40',
              )}
            >
              {d}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onToggleNotes}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
            notesMode
              ? 'border-claude-clay bg-claude-clay text-claude-surface'
              : 'border-claude-line bg-claude-surface text-claude-ink hover:border-claude-clay',
          )}
        >
          <Pencil size={15} /> Notes {notesMode ? 'on' : 'off'}
        </button>
        <button
          type="button"
          onClick={onErase}
          disabled={disabled}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-claude-line bg-claude-surface px-3 py-2 text-sm text-claude-ink transition-colors hover:border-claude-clay hover:bg-claude-clay-soft/40"
        >
          <Eraser size={15} /> Erase
        </button>
      </div>
    </div>
  )
}
