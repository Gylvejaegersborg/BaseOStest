import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from './NavBar'
import { MobileTopBar, MobileBottomNav } from './MobileNav'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { CalendarProvider, useCalendar } from '@/features/calendar/CalendarContext'
import { NudgeStack } from '@/features/calendar/NudgeStack'
import { OsOverlayProvider } from '@/features/team/osOverlay'
import { AgentOsProvider } from '@/features/agentos/AgentOsProvider'
import { sectionForPath } from '@/data/sections'

function GlobalNudges() {
  const { remindersEngine } = useCalendar()
  return (
    <NudgeStack
      nudges={remindersEngine.nudges}
      onDismiss={remindersEngine.dismiss}
      onSnooze={remindersEngine.snooze}
      onComplete={remindersEngine.complete}
    />
  )
}

export function AppShell() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const section = sectionForPath(location.pathname)

  return (
    <OsOverlayProvider>
      <CalendarProvider>
      <AgentOsProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-bg text-text">
        <NavBar className="hidden lg:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          {!isHome && (
            <div className="hidden lg:block">
              <TopBar />
            </div>
          )}
          <main className="relative min-h-0 flex-1 overflow-hidden">
            {/* Keyed by section, not full pathname — this is the "you moved
                to a different room" cross-fade (navigation model, Phase 3),
                so it fires on a top-level section switch only, never on
                internal navigation within the same section. */}
            <div key={section.id} className="h-full animate-cross-fade">
              <Outlet />
            </div>
          </main>
          {!isHome && (
            <div className="hidden lg:block">
              <StatusBar />
            </div>
          )}
          <MobileBottomNav />
        </div>
      </div>
      <GlobalNudges />
      </AgentOsProvider>
      </CalendarProvider>
    </OsOverlayProvider>
  )
}
