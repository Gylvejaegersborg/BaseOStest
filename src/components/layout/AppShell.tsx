import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from './NavBar'
import { MobileNav } from './MobileNav'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { CalendarProvider, useCalendar } from '@/features/calendar/CalendarContext'
import { NudgeStack } from '@/features/calendar/NudgeStack'

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

  return (
    <CalendarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
        <NavBar className="hidden lg:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav />
          {!isHome && (
            <div className="hidden lg:block">
              <TopBar />
            </div>
          )}
          <main className="relative min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
          {!isHome && (
            <div className="hidden lg:block">
              <StatusBar />
            </div>
          )}
        </div>
      </div>
      <GlobalNudges />
    </CalendarProvider>
  )
}
