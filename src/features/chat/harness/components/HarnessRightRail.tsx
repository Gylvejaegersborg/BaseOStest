import { ChevronsRight, ChevronsLeft } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useHarness } from '../state/harnessStore'
import { AgentRail } from './AgentRail'
import { TaskRail } from './TaskRail'
import { AutomationRail } from './AutomationRail'
import { ActivityRail } from './ActivityRail'

export function HarnessRightRail() {
  const { state, setRightRail } = useHarness()

  if (state.rightRail === 'hidden') return null

  if (state.rightRail === 'collapsed') {
    return (
      <div className="flex w-9 shrink-0 flex-col items-center border-l border-line bg-panel/40 py-2">
        <button
          type="button"
          title="Expand right rail"
          onClick={() => setRightRail('expanded')}
          className="rounded p-1.5 text-dim hover:text-text"
        >
          <ChevronsLeft size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className={cn('flex w-64 shrink-0 flex-col overflow-y-auto border-l border-line bg-panel/40')}>
      <div className="flex items-center justify-end border-b border-line px-2 py-1">
        <button
          type="button"
          title="Collapse right rail"
          onClick={() => setRightRail('collapsed')}
          className="rounded p-1 text-dim hover:text-text"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
      <div className="divide-y divide-line">
        <AgentRail />
        <TaskRail />
        <AutomationRail />
        <ActivityRail />
      </div>
    </div>
  )
}
