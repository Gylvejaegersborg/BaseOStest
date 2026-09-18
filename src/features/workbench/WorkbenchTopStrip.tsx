import { useState, type ReactNode } from 'react'
import { ListChecks, Workflow, FileStack, ShieldCheck, Activity as ActivityIcon, Brain, History, Briefcase, StickyNote, Settings, LayoutPanelLeft } from 'lucide-react'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'

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

const ALL_TABS = [...STRIP_TABS, TEAM_STRIP_TAB]

/**
 * The workbench's single top strip — replaces the old two-bar layout
 * (a page-level "Viewing X" row stacked above the conversation pane's own
 * thread-picker bar) with one row: `left` is whichever agent/thread
 * identity is active (or "All agents"), the icons on the right toggle the
 * right-side panel open to that tab (click the active one again to
 * close it — the same activity-bar pattern Claude Code's own UI uses).
 * New Flow lives inside the Flow tab itself (FlowTab.tsx), not here — it's
 * an action scoped to that panel's own content, not a global strip action.
 *
 * Responsive pass (Phase 6): nine separate icon buttons plus Settings
 * don't fit a phone-width bar next to the agent identity and its own back
 * control. Below `lg`, the nine collapse into one "Panels" overflow
 * button with a dropdown list — the tabs themselves are runtime state,
 * not navigation, so folding them behind one control loses nothing a
 * mobile user reaches for constantly.
 */
export function WorkbenchTopStrip({
  left,
  activePanel,
  onSelectTab,
  onOpenSettings,
}: {
  left: ReactNode
  activePanel: StripTab | null
  onSelectTab: (tab: StripTab) => void
  onOpenSettings: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
      <div className="min-w-0 flex-1">{left}</div>
      <div className="flex shrink-0 items-center gap-1">
        <div className="hidden items-center gap-1 lg:flex">
          <Tabs tabs={STRIP_TABS} active={activePanel} onChange={onSelectTab} />
          <div className="mx-1 h-4 w-px bg-line" />
          <Tabs tabs={[TEAM_STRIP_TAB]} active={activePanel} onChange={onSelectTab} />
        </div>

        <div className="relative lg:hidden">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            title="Panels"
            className={cn(
              'flex items-center gap-1.5 border p-2 transition-colors',
              activePanel || menuOpen ? 'border-accent/40 bg-accent/10 text-accent' : 'border-transparent text-dim hover:border-line hover:text-text',
            )}
          >
            <LayoutPanelLeft size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-docked border border-line bg-panel shadow-elevation-3">
              {ALL_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTab(t.id)
                    setMenuOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-panel-2',
                    activePanel === t.id ? 'text-accent' : 'text-text',
                  )}
                >
                  {t.icon && <t.icon size={13} />}
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

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
