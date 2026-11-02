import { useEffect, useState } from 'react'
import { getDesktopFocus, subscribeToEvents, type AgentOsDesktopFocus } from '@/features/agentos/sessionClient'

/** The window in front (from agent-os's desktop sensor) and the project/goal it serves, kept live from the
 *  `desktop.focus` bus event on the app's one EventSource. Null when the sensor isn't running. */
export function useDesktopFocus(): AgentOsDesktopFocus | null {
  const [focus, setFocus] = useState<AgentOsDesktopFocus | null>(null)
  useEffect(() => {
    let alive = true
    getDesktopFocus()
      .then((f) => alive && setFocus(f && f.app ? f : null))
      .catch(() => {})
    const dispose = subscribeToEvents(['desktop.focus'], (e) => {
      const p = e.payload as unknown as AgentOsDesktopFocus
      setFocus(p && p.app ? p : null)
    })
    return () => {
      alive = false
      dispose()
    }
  }, [])
  return focus
}
