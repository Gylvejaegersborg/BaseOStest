import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useHarness } from '../state/harnessStore'
import { TerminalPanel } from './TerminalPanel'

export function HarnessBottomRail() {
  const { state, setBottomRail } = useHarness()

  if (state.bottomRail === 'hidden') return null

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col border-t border-line bg-panel/40',
        state.bottomRail === 'collapsed' ? 'h-8' : 'h-40',
      )}
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="text-[10px] uppercase tracking-wider text-dim">Terminal</span>
        <button
          type="button"
          title={state.bottomRail === 'collapsed' ? 'Expand terminal' : 'Collapse terminal'}
          onClick={() => setBottomRail(state.bottomRail === 'collapsed' ? 'expanded' : 'collapsed')}
          className="rounded p-1 text-dim hover:text-text"
        >
          {state.bottomRail === 'collapsed' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
      {state.bottomRail === 'expanded' && (
        <div className="min-h-0 flex-1">
          <TerminalPanel />
        </div>
      )}
    </div>
  )
}
