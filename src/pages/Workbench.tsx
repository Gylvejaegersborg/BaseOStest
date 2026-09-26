import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { AgentRail } from '@/features/workbench/AgentRail'
import { AgentWorkspace } from '@/features/workbench/AgentWorkspace'
import { WorkbenchTopStrip, type StripTab } from '@/features/workbench/WorkbenchTopStrip'
import { RightPanel } from '@/features/workbench/RightPanel'
import { NewFlowModal } from '@/features/workbench/NewFlowModal'
import { SettingsModal } from '@/features/workbench/SettingsModal'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import type { FlowStepInput } from '@/features/agentos/sessionClient'
import { cn } from '@/lib/cn'

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
 *
 * Responsive pass (Phase 6): desktop keeps the rail + main-content
 * multi-pane layout at all times; below `lg` it collapses to a single
 * focused surface per the design doc ("focused surface is single-pane
 * at all times") — the rail full-width until an agent or Team is picked,
 * then that surface takes over full-width with a back control to return.
 */
export function Workbench() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { agents } = useAgentOsContext()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(() => {
    const param = searchParams.get('agent')
    return param && agents.some((a) => a.id === param) ? param : null
  })
  const [activePanel, setActivePanel] = useState<StripTab | null>(() => {
    const param = searchParams.get('panel')
    return param === 'team' || param === 'teams' ? 'teams' : param === 'crons' ? 'crons' : null
  })
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null)
  const [activeFlowSteps, setActiveFlowSteps] = useState<FlowStepInput[]>([])
  const [newFlowOpen, setNewFlowOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dockedNoteId, setDockedNoteId] = useState<string | null>(null)

  // Shared by a chat message's "Send to Notes" action and the composer's
  // note picker — either summons the same docked Notes panel to the same note.
  const dockNote = (id: string | null) => {
    setDockedNoteId(id)
    if (id) setActivePanel('notes')
  }

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

  // Below `lg`, this is the single focused surface's "back" action —
  // returns to the rail as the mobile home view.
  const backToRail = () => {
    setSelectedAgentId(null)
    setSearchParams({}, { replace: true })
  }

  // On phones the rail is home until an agent is picked or a panel opened.
  const railFocused = !selectedAgentId && !activePanel

  return (
    <div className="flex h-full">
      <div className={cn('h-full', railFocused ? 'flex' : 'hidden lg:flex')}>
        <AgentRail selectedAgentId={selectedAgentId} onSelect={selectAgent} />
      </div>

      <div className={cn('min-w-0 flex-1 flex-col', railFocused ? 'hidden lg:flex' : 'flex')}>
        {selectedAgentId ? (
          <AgentWorkspace
            key={selectedAgentId}
            agentId={selectedAgentId}
            activePanel={activePanel}
            onSelectTab={selectTab}
            onNewFlow={() => setNewFlowOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            flowId={activeFlowId}
            flowSteps={activeFlowSteps}
            onSelectFlow={selectFlow}
            dockedNoteId={dockedNoteId}
            onDockNote={dockNote}
            onBack={backToRail}
          />
        ) : (
          <>
            <WorkbenchTopStrip
              left={
                <span className="flex items-center gap-2 text-xs text-dim">
                  <button onClick={() => setActivePanel(null)} className="text-dim hover:text-text lg:hidden" title="Back to agents">
                    <ChevronLeft size={14} />
                  </button>
                  All agents
                </span>
              }
              activePanel={activePanel}
              onSelectTab={selectTab}
              onOpenSettings={() => setSettingsOpen(true)}
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
                  dockedNoteId={dockedNoteId}
                  onSelectNote={dockNote}
                  onNewFlow={() => setNewFlowOpen(true)}
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
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
