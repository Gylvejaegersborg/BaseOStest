import type { ReactNode } from 'react'
import { ListChecks, Workflow, FileStack, ShieldCheck, Activity as ActivityIcon, Brain, History, Briefcase, StickyNote, Plus, Settings } from 'lucide-react'
import { Tabs, type TabItem } from '@/components/ui/Tabs'

export type StripTab = 'tasks' | 'flow' | 'artifacts' | 'approvals' | 'events' | 'memory' | 'files' | 'notes' | 'team'

export const STRIP_TABS: TabItem<StripTab>[] = [
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'flow', label: 'Flow', icon: Workflow },
  { id: 'artifacts', label: 'Artifacts', icon: FileStack },
  { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { id: 'events', label: 'Events', icon: ActivityIcon },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'files', label: 'Files', icon: History },
  { id: 'notes', label: 'Notes', icon: StickyNote },
]

/** Team is its own group, not just an eighth runtime-state tab — it's the
 *  management/oversight surface (brief, board, approvals queue, intake,
 *  reports, meetings) merged in from the old standalone Team page (IA
 *  decision, Phase 4), so it's visually separated by a divider rather than
 *  appended into the agent-runtime row above. */
export const TEAM_STRIP_TAB: TabItem<StripTab> = { id: 'team', label: 'Team', icon: Briefcase }

/**
 * The workbench's single top strip — replaces the old two-bar layout
 * (a page-level "Viewing X" row stacked above the conversation pane's own
 * thread-picker bar) with one row: `left` is whichever agent/thread
 * identity is active (or "All agents"), the icons on the right toggle the
 * right-side panel open to that tab (click the active one again to
 * close it — the same activity-bar pattern Claude Code's own UI uses),
 * and New Flow opens the flow-creation modal.
 */
export function WorkbenchTopStrip({
  left,
  activePanel,
  onSelectTab,
  onNewFlow,
  onOpenSettings,
}: {
  left: ReactNode
  activePanel: StripTab | null
  onSelectTab: (tab: StripTab) => void
  onNewFlow: () => void
  onOpenSettings: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
      <div className="min-w-0 flex-1">{left}</div>
      <div className="flex shrink-0 items-center gap-1">
        <Tabs tabs={STRIP_TABS} active={activePanel} onChange={onSelectTab} />
        <div className="mx-1 h-4 w-px bg-line" />
        <Tabs tabs={[TEAM_STRIP_TAB]} active={activePanel} onChange={onSelectTab} />
        <button
          onClick={onNewFlow}
          className="ml-1 flex items-center gap-1.5 border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-accent hover:bg-accent/20"
        >
          <Plus size={12} /> <span className="hidden sm:inline">New Flow</span>
        </button>
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="flex items-center gap-1.5 border border-transparent px-2 py-1.5 text-dim hover:border-line hover:text-text"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  )
}
