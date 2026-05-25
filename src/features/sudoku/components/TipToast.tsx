import { Coffee, X } from 'lucide-react'
import type { Hint } from '../engine/hints'

interface TipToastProps {
  tip: Hint | null
  onMoreHelp: () => void
  onDismiss: () => void
}

export function TipToast({ tip, onMoreHelp, onDismiss }: TipToastProps) {
  if (!tip) return null
  return (
    <div className="pointer-events-auto fixed bottom-5 left-1/2 z-40 w-[min(92vw,26rem)] -translate-x-1/2 animate-fade-in rounded-lg border border-claude-clay/40 bg-claude-surface p-4 shadow-[0_8px_30px_rgba(31,30,28,0.18)]">
      <div className="mb-1 flex items-center gap-2">
        <Coffee size={15} className="text-claude-clay" />
        <span className="text-xs uppercase tracking-wide text-claude-ink-2">Taking a moment?</span>
        <button type="button" onClick={onDismiss} className="ml-auto text-claude-ink-2 hover:text-claude-ink">
          <X size={15} />
        </button>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-claude-ink">{tip.message}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onMoreHelp}
          className="rounded-md bg-claude-clay px-3 py-1.5 text-sm text-claude-surface transition-colors hover:bg-claude-clay/90"
        >
          Walk me through it
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md border border-claude-line px-3 py-1.5 text-sm text-claude-ink-2 transition-colors hover:text-claude-ink"
        >
          I've got it
        </button>
      </div>
    </div>
  )
}
