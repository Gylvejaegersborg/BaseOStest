import { X } from 'lucide-react'
import { TasksTab } from './TasksTab'
import { ArtifactsTab } from './ArtifactsTab'
import { ApprovalsTab } from './ApprovalsTab'
import { FlowTab } from './FlowTab'
import { EventsTab } from './EventsTab'
import { MemoryTab } from './MemoryTab'
import { FileRevisionsTab } from './FileRevisionsTab'
import { NotesTab } from './NotesTab'
import { TeamsTab } from './TeamsTab'
import { CronManager } from '@/features/calendar/CronManager'
import { STRIP_TABS, type StripTab } from './WorkbenchTopStrip'
import { useResizablePanel } from '@/components/ui/useResizablePanel'
import { ResizeHandle } from '@/components/ui/ResizeHandle'
import type { FlowStepInput } from '@/features/agentos/sessionClient'

/**
 * The workbench's right-side panel — Claude Code's own side-panel pattern:
 * one tab's content at a time, opened/closed via the top strip's icons
 * (see WorkbenchTopStrip), rather than the earlier always-visible bottom
 * strip. Tasks/Artifacts/Events stay filtered to the selected agent when
 * one is chosen; Flow and Approvals span every agent. Resizable via its
 * left edge, persisted per-viewer like the AgentRail's own width.
 *
 * Responsive pass (Phase 6): this is the dock zone's "summoned" role —
 * desktop drags to the edge as a side pane, mobile has no edge to drag
 * to, so below `lg` it becomes a bottom sheet instead (fixed to the
 * viewport bottom, radius-lg top corners, dismissible via backdrop tap)
 * per the design doc's per-surface panel-role table.
 */
export function RightPanel({
  tab,
  agentId,
  flowId,
  flowSteps,
  onSelectFlow,
  onClose,
  dockedNoteId,
  onSelectNote,
  onNewFlow,
}: {
  tab: StripTab
  agentId: string | null
  flowId: string | null
  flowSteps: FlowStepInput[]
  onSelectFlow: (id: string | null, steps: FlowStepInput[]) => void
  onClose: () => void
  dockedNoteId: string | null
  onSelectNote: (id: string | null) => void
  onNewFlow: () => void
}) {
  const label = STRIP_TABS.find((t) => t.id === tab)?.label ?? tab
  const { width, onMouseDown } = useResizablePanel({
    defaultWidth: 380,
    min: 280,
    max: 720,
    edge: 'left',
    storageKey: 'os:workbench:rightPanelWidth',
  })

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-30 bg-bg/60 lg:hidden" />
      <div className="flex h-full shrink-0 max-lg:!h-auto max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40">
        <ResizeHandle onMouseDown={onMouseDown} className="max-lg:hidden" />
        <aside
          className="flex h-full max-w-[90vw] flex-col border-l border-line-2 bg-panel/40 max-lg:!h-auto max-lg:!w-full max-lg:max-h-[75vh] max-lg:max-w-none max-lg:animate-sheet-up max-lg:rounded-t-panel max-lg:border-l-0 max-lg:border-t"
          style={{ width }}
        >
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="label">{label}</span>
            <button onClick={onClose} className="text-dim hover:text-text" title="Close">
              <X size={14} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'tasks' && <TasksTab agentId={agentId} />}
            {tab === 'flow' && <FlowTab flowId={flowId} steps={flowSteps} onSelectFlow={onSelectFlow} onNewFlow={onNewFlow} />}
            {tab === 'artifacts' && <ArtifactsTab agentId={agentId} />}
            {tab === 'approvals' && <ApprovalsTab />}
            {tab === 'events' && <EventsTab agentId={agentId} />}
            {tab === 'memory' && <MemoryTab agentId={agentId} />}
            {tab === 'files' && <FileRevisionsTab />}
            {tab === 'notes' && <NotesTab dockedNoteId={dockedNoteId} onSelectNote={onSelectNote} />}
            {tab === 'crons' && <CronManager variant="table" className="p-3" />}
            {tab === 'teams' && <TeamsTab />}
          </div>
        </aside>
      </div>
    </>
  )
}
