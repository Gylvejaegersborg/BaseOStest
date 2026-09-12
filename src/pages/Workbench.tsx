import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ListChecks, Workflow, FileStack, ShieldCheck, Activity as ActivityIcon, Plus } from 'lucide-react'
import { AgentRail } from '@/features/workbench/AgentRail'
import { ConversationPane } from '@/features/workbench/ConversationPane'
import { TasksTab } from '@/features/workbench/TasksTab'
import { ArtifactsTab } from '@/features/workbench/ArtifactsTab'
import { ApprovalsTab } from '@/features/workbench/ApprovalsTab'
import { FlowTab } from '@/features/workbench/FlowTab'
import { EventsTab } from '@/features/workbench/EventsTab'
import { NewFlowModal } from '@/features/workbench/NewFlowModal'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import type { FlowStepInput } from '@/features/agentos/sessionClient'
import { cn } from '@/lib/cn'

type StripTab = 'tasks' | 'flow' | 'artifacts' | 'approvals' | 'events'

const STRIP_TABS: { id: StripTab; label: string; icon: typeof ListChecks }[] = [
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'flow', label: 'Flow', icon: Workflow },
  { id: 'artifacts', label: 'Artifacts', icon: FileStack },
  { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { id: 'events', label: 'Events', icon: ActivityIcon },
]

/**
 * The single-page Agent-OS workbench — the merged replacement for the old
 * Chat and Meeting Room pages (and the Agent-OS half of Team's Approvals
 * tab). Left rail picks an agent, which filters everything else: their
 * threads in the center conversation pane, their own Tasks/Artifacts in
 * the bottom strip. Flow, Approvals and Events are unfiltered — runtime
 * state that spans every agent.
 */
export function Workbench() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { agents } = useAgentOsContext()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(() => {
    const param = searchParams.get('agent')
    return param && agents.some((a) => a.id === param) ? param : null
  })
  const [tab, setTab] = useState<StripTab>('tasks')
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null)
  const [activeFlowSteps, setActiveFlowSteps] = useState<FlowStepInput[]>([])
  const [newFlowOpen, setNewFlowOpen] = useState(false)

  const selectAgent = (id: string) => {
    setSelectedAgentId(id)
    setSearchParams({ agent: id }, { replace: true })
  }

  const selectFlow = (id: string | null, steps: FlowStepInput[]) => {
    setActiveFlowId(id)
    setActiveFlowSteps(steps)
  }

  return (
    <div className="flex h-full">
      <AgentRail selectedAgentId={selectedAgentId} onSelect={selectAgent} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <span className="text-xs text-dim">
            {selectedAgentId ? `Viewing ${agents.find((a) => a.id === selectedAgentId)?.name ?? selectedAgentId}` : 'All agents'}
          </span>
          <button
            onClick={() => setNewFlowOpen(true)}
            className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] uppercase tracking-wider text-accent hover:bg-accent/20"
          >
            <Plus size={12} /> New Flow
          </button>
        </div>

        <div className="min-h-0 flex-1">
          {selectedAgentId ? (
            <ConversationPane agentId={selectedAgentId} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-dim">Pick an agent on the left to open a conversation.</div>
          )}
        </div>

        <div className="flex h-[34%] min-h-[220px] flex-col border-t border-line-2">
          <div className="flex border-b border-line">
            {STRIP_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 border-r border-line px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors',
                  tab === t.id ? 'bg-panel-2 text-text' : 'text-dim hover:text-text',
                )}
              >
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'tasks' && <TasksTab agentId={selectedAgentId} />}
            {tab === 'flow' && <FlowTab flowId={activeFlowId} steps={activeFlowSteps} onSelectFlow={selectFlow} />}
            {tab === 'artifacts' && <ArtifactsTab agentId={selectedAgentId} />}
            {tab === 'approvals' && <ApprovalsTab />}
            {tab === 'events' && <EventsTab agentId={selectedAgentId} />}
          </div>
        </div>
      </div>

      <NewFlowModal
        open={newFlowOpen}
        onClose={() => setNewFlowOpen(false)}
        onCreated={(flowId, steps) => {
          selectFlow(flowId, steps)
          setTab('flow')
        }}
      />
    </div>
  )
}
