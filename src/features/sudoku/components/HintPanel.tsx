import { ChevronRight, Lightbulb, Wand2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { MAX_HINT_LEVEL, type Hint } from '../engine/hints'

interface HintPanelProps {
  hint: Hint | null
  onRequest: () => void
  onApply: () => void
  onDismiss: () => void
}

export function HintPanel({ hint, onRequest, onApply, onDismiss }: HintPanelProps) {
  return (
    <div className="rounded-lg border border-claude-line bg-claude-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb size={16} className="text-claude-clay" />
        <h3 className="font-claude text-base font-medium text-claude-ink">Coach</h3>
        {hint?.kind === 'step' && (
          <span className="ml-auto flex items-center gap-1">
            {Array.from({ length: MAX_HINT_LEVEL }, (_, k) => (
              <span
                key={k}
                className={cn('h-1.5 w-1.5 rounded-full', k < hint.level ? 'bg-claude-clay' : 'bg-claude-line')}
              />
            ))}
          </span>
        )}
      </div>

      {!hint ? (
        <>
          <p className="mb-3 text-sm leading-relaxed text-claude-ink-2">
            Stuck or unsure? I'll point you to the next logical step — starting with a gentle nudge, not the answer.
          </p>
          <button
            type="button"
            onClick={onRequest}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-claude-clay px-3 py-2 text-sm text-claude-surface transition-colors hover:bg-claude-clay/90"
          >
            <Lightbulb size={15} /> Give me a nudge
          </button>
        </>
      ) : (
        <>
          <p className="mb-1 text-xs uppercase tracking-wide text-claude-ink-2">{hint.title}</p>
          <p className="mb-3 text-sm leading-relaxed text-claude-ink">{hint.message}</p>
          <div className="flex flex-wrap gap-2">
            {hint.kind === 'step' && hint.level < MAX_HINT_LEVEL && (
              <button
                type="button"
                onClick={onRequest}
                className="flex items-center gap-1.5 rounded-md bg-claude-clay px-3 py-1.5 text-sm text-claude-surface transition-colors hover:bg-claude-clay/90"
              >
                Show more <ChevronRight size={14} />
              </button>
            )}
            {hint.canApply && (
              <button
                type="button"
                onClick={onApply}
                className="flex items-center gap-1.5 rounded-md border border-claude-clay bg-claude-clay-soft/40 px-3 py-1.5 text-sm text-claude-ink transition-colors hover:bg-claude-clay-soft"
              >
                <Wand2 size={14} /> Place it for me
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center gap-1.5 rounded-md border border-claude-line px-3 py-1.5 text-sm text-claude-ink-2 transition-colors hover:border-claude-clay hover:text-claude-ink"
            >
              <X size={14} /> Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  )
}
