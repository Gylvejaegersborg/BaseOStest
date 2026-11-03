import { useEffect, useState } from 'react'
import { CalendarProvider } from '@/features/calendar/CalendarContext'
import { OsOverlayProvider } from '@/features/overlay/osOverlay'
import { AgentOsProvider } from '@/features/agentos/AgentOsProvider'
import { Launcher } from '@/features/launcher/Launcher'
import { HudDot } from './HudDot'
import { inFront, setDotWindowOn, shellWindow } from './shell'
import { useHud } from './useHud'

/** /hud — what the desktop shell's windows load: `?window=launcher` (the launcher alone, shown by Alt+B) or
 *  `?window=dot` (the dot alone, in a small click-through window the shell keeps beside the cursor). The page is
 *  transparent so only the launcher or the dot shows over the desktop. Same providers as the app, so the
 *  launcher's commands and the HUD's agent thread work as in a normal tab. */
export function HudPage() {
  useEffect(() => {
    const prev = [document.documentElement.style.background, document.body.style.background]
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    return () => {
      document.documentElement.style.background = prev[0]
      document.body.style.background = prev[1]
    }
  }, [])
  const win = shellWindow() ?? (new URLSearchParams(window.location.search).get('window') === 'dot' ? 'dot' : 'launcher')
  return (
    <OsOverlayProvider>
      <CalendarProvider>
        <AgentOsProvider>{win === 'dot' ? <DotWindow /> : <Launcher shell />}</AgentOsProvider>
      </CalendarProvider>
    </OsOverlayProvider>
  )
}

/** The dot window: while it's showing it answers push-to-talk, with a screenshot each time (it only exists in the
 *  shell). Hidden, it stays out of the way so the launcher answers instead. */
function DotWindow() {
  // Asked of the shell (a hidden Tauri window doesn't reliably mark its page hidden), once a second.
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const check = () => void inFront().then(setVisible)
    check()
    const t = window.setInterval(check, 1000)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => setDotWindowOn(visible), [visible])
  const hud = useHud({ active: visible, screenshots: true })
  return <HudDot hud={hud} fixed />
}
