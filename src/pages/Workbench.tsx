import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AgentRail } from '@/features/workbench/AgentRail'
import { AgentWorkspace } from '@/features/workbench/AgentWorkspace'
import { WorkbenchTopStrip, type StripTab } from '@/features/workbench/WorkbenchTopStrip'
import { RightPanel } from '@/features/workbench/RightPanel'
import { NewFlowModal } from '@/features/workbench/NewFlowModal'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import type { FlowStepInput } from '@/features/agentos/sessionClient'

/**
 * The single-page Agent-OS workbench — the merged replacement for the old
 * Chat and Meeting Room pages (and the Agent-OS half of Team's Approvals
 * tab). Left rail picks an agent, which filters everything else: their
 * threads in the center conversation pane, their own Tasks/Artifacts in
 * the right panel. Flow, Approvals and Events are unfiltered — runtime
 * state that spans every agent. Tasks/Flow/Artifacts/Approvals/Events
 * live as icon toggles in the top strip, opening a right-side panel one
 * at a time (Claude Code's own side-panel pattern) rather than an
 * always-visible bottom strip.
 */
export function Workbench() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { agents } = useAgentOsContext()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(() => {
    const param = searchParams.get('agent')
    return param && agents.some((a) => a.id === param) ? param : null
  })
  const [activePanel, setActivePanel] = useState<StripTab | null>(null)
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

  // Clicking the already-open tab closes the panel — same toggle behavior
  // an activity-bar icon has.
  const selectTab = (tab: StripTab) => setActivePanel((cur) => (cur === tab ? null : tab))

  return (
    <div className="flex h-full">
      <AgentRail selectedAgentId={selectedAgentId} onSelect={selectAgent} />

      <div className="flex min-w-0 flex-1 flex-col">
        {selectedAgentId ? (
          <AgentWorkspace
            key={selectedAgentId}
            agentId={selectedAgentId}
            activePanel={activePanel}
            onSelectTab={selectTab}
            onNewFlow={() => setNewFlowOpen(true)}
            flowId={activeFlowId}
            flowSteps={activeFlowSteps}
            onSelectFlow={selectFlow}
          />
        ) : (
          <>
            <WorkbenchTopStrip
              left={<span className="text-xs text-dim">All agents</span>}
              activePanel={activePanel}
              onSelectTab={selectTab}
              onNewFlow={() => setNewFlowOpen(true)}
            />
            <div className="flex min-h-0 flex-1">
              <div className="flex flex-1 items-center justify-center text-xs text-dim">Pick an agent on the left to open a conversation.</div>
              {activePanel && (
                <RightPanel
                  tab={activePanel}
                  agentId={null}
                  flowId={activeFlowId}
                  flowSteps={activeFlowSteps}
                  onSelectFlow={selectFlow}
                  onClose={() => setActivePanel(null)}
                />
              )}
            </div>
          </>
        )}
      </div>

      <NewFlowModal
        open={newFlowOpen}
        onClose={() => setNewFlowOpen(false)}
        onCreated={(flowId, steps) => {
          selectFlow(flowId, steps)
          setActivePanel('flow')
        }}
      />
    </div>
  )
}
