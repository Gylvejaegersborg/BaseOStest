import { Eraser, Pencil } from 'lucide-react'
import { cn } from '@/lib/cn'

interface NumberPadProps {
  remaining: number[]
  notesMode: boolean
  disabled: boolean
  onDigit: (d: number) => void
  onErase: () => void
  onToggleNotes: () => void
}

export function NumberPad({ remaining, notesMode, disabled, onDigit, onErase, onToggleNotes }: NumberPadProps) {
  return (
    <div className="w-full max-w-[min(92vw,30rem)]">
      <div className="grid grid-cols-9 gap-1.5">
        {Array.from({ length: 9 }, (_, k) => {
          const d = k + 1
          const left = remaining[k]
          const done = left <= 0
          return (
            <button
              key={d}
              type="button"
              disabled={disabled || done}
              onClick={() => onDigit(d)}
              className={cn(
                'relative aspect-square rounded-md border border-claude-line bg-claude-surface font-claude text-lg text-claude-ink transition-colors',
                'hover:border-claude-clay hover:bg-claude-clay-soft/40',
                done && 'cursor-default text-claude-ink-2/40 hover:border-claude-line hover:bg-claude-surface',
              )}
            >
              {d}
              {!done && (
                <span className="absolute bottom-0.5 right-1 text-[9px] font-sans text-claude-ink-2">{left}</span>
              )}
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
