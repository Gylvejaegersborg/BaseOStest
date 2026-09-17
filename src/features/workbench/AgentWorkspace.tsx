import { ChevronLeft } from 'lucide-react'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { useAgentOsChat } from '@/features/agentos/useAgentOsChat'
import type { FlowStepInput } from '@/features/agentos/sessionClient'
import { ThreadHeader } from './ThreadHeader'
import { ConversationPane } from './ConversationPane'
import { WorkbenchTopStrip, type StripTab } from './WorkbenchTopStrip'
import { RightPanel } from './RightPanel'

/**
 * Everything to the right of the AgentRail once an agent is selected —
 * one useAgentOsChat instance shared by the top strip's ThreadHeader and
 * the conversation body below it, so switching or creating a thread in
 * one place is immediately reflected in the other (they were two separate
 * hook instances before the top-strip merge, which could desync).
 */
export function AgentWorkspace({
  agentId,
  activePanel,
  onSelectTab,
  onNewFlow,
  onOpenSettings,
  flowId,
  flowSteps,
  onSelectFlow,
  dockedNoteId,
  onDockNote,
  onBack,
}: {
  agentId: string
  activePanel: StripTab | null
  onSelectTab: (tab: StripTab) => void
  onNewFlow: () => void
  onOpenSettings: () => void
  flowId: string | null
  flowSteps: FlowStepInput[]
  onSelectFlow: (id: string | null, steps: FlowStepInput[]) => void
  dockedNoteId: string | null
  onDockNote: (id: string | null) => void
  onBack: () => void
}) {
  const { agents } = useAgentOsContext()
  const agent = agents.find((a) => a.id === agentId)
  const chat = useAgentOsChat(agentId)

  if (!agent) return null

  return (
    <>
      <WorkbenchTopStrip
        left={
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={onBack} className="shrink-0 text-dim hover:text-text lg:hidden" title="Back to agents">
              <ChevronLeft size={14} />
            </button>
            <ThreadHeader agent={agent} chat={chat} />
          </div>
        }
        activePanel={activePanel}
        onSelectTab={onSelectTab}
        onNewFlow={onNewFlow}
        onOpenSettings={onOpenSettings}
      />
      <div className="flex min-h-0 flex-1">
        <ConversationPane agent={agent} chat={chat} onDockNote={onDockNote} />
        {activePanel && (
          <RightPanel
            tab={activePanel}
            agentId={agentId}
            flowId={flowId}
            flowSteps={flowSteps}
            onSelectFlow={onSelectFlow}
            onClose={() => onSelectTab(activePanel)}
            dockedNoteId={dockedNoteId}
            onSelectNote={onDockNote}
          />
        )}
      </div>
    </>
  )
}
