import { HarnessProvider, useHarness } from './state/harnessStore'
import { HarnessTopBar } from './components/HarnessTopBar'
import { HarnessActivityBar } from './components/HarnessActivityBar'
import { HarnessRightRail } from './components/HarnessRightRail'
import { HarnessBottomRail } from './components/HarnessBottomRail'
import { ConversationPanel } from './components/ConversationPanel'
import { TeamPanel } from './components/TeamPanel'
import { MeetingPanel } from './components/MeetingPanel'
import { FilesPanel } from './components/FilesPanel'
import { ToolsPanel } from './components/ToolsPanel'

/** The Harness workspace — per plan §24's default layout:
 *
 *    Top Bar
 *    ---------------------------------------
 *    Activity | Workspace         | Right Rail
 *    Bar      | (view-dependent)  | (Agents/Tasks/Automations/Activity)
 *    ---------------------------------------
 *    Bottom Rail (Terminal)
 *
 *  View switching (chat/team/meeting/files/tools) is LOCAL state per
 *  plan §66 — everything stays under the single /chat route, no React
 *  Router involvement inside the Harness. */
function HarnessWorkspace() {
  const { state } = useHarness()

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <HarnessTopBar />
      <div className="flex min-h-0 flex-1">
        <HarnessActivityBar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            {state.activeView === 'chat' && <ConversationPanel />}
            {state.activeView === 'team' && <TeamPanel />}
            {state.activeView === 'meeting' && <MeetingPanel />}
            {state.activeView === 'files' && <FilesPanel />}
            {state.activeView === 'tools' && <ToolsPanel />}
            <HarnessRightRail />
          </div>
          <HarnessBottomRail />
        </div>
      </div>
    </div>
  )
}

export function ChatHarness() {
  return (
    <HarnessProvider>
      <HarnessWorkspace />
    </HarnessProvider>
  )
}
