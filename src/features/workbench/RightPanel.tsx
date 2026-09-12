import { X } from 'lucide-react'
import { TasksTab } from './TasksTab'
import { ArtifactsTab } from './ArtifactsTab'
import { ApprovalsTab } from './ApprovalsTab'
import { FlowTab } from './FlowTab'
import { EventsTab } from './EventsTab'
import { STRIP_TABS, type StripTab } from './WorkbenchTopStrip'
import type { FlowStepInput } from '@/features/agentos/sessionClient'

/**
 * The workbench's right-side panel — Claude Code's own side-panel pattern:
 * one tab's content at a time, opened/closed via the top strip's icons
 * (see WorkbenchTopStrip), rather than the earlier always-visible bottom
 * strip. Tasks/Artifacts/Events stay filtered to the selected agent when
 * one is chosen; Flow and Approvals span every agent.
 */
export function RightPanel({
  tab,
  agentId,
  flowId,
  flowSteps,
  onSelectFlow,
  onClose,
}: {
  tab: StripTab
  agentId: string | null
  flowId: string | null
  flowSteps: FlowStepInput[]
  onSelectFlow: (id: string | null, steps: FlowStepInput[]) => void
  onClose: () => void
}) {
  const label = STRIP_TABS.find((t) => t.id === tab)?.label ?? tab

  return (
    <aside className="flex h-full w-[380px] max-w-[90vw] shrink-0 flex-col border-l border-line-2 bg-panel/40">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="label">{label}</span>
        <button onClick={onClose} className="text-dim hover:text-text" title="Close">
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'tasks' && <TasksTab agentId={agentId} />}
        {tab === 'flow' && <FlowTab flowId={flowId} steps={flowSteps} onSelectFlow={onSelectFlow} />}
        {tab === 'artifacts' && <ArtifactsTab agentId={agentId} />}
        {tab === 'approvals' && <ApprovalsTab />}
        {tab === 'events' && <EventsTab agentId={agentId} />}
      </div>
    </aside>
  )
}
