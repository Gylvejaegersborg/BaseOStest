// The desktop shell (BaseOStest's `shell/`, a Tauri app) around the launcher: the HUD's windows, the global Alt+B,
// and the one thing a web page can't do, a screenshot of the whole desktop. In a plain browser tab every call
// here is a no-op, so the launcher works the same without the shell (minus the screenshot and the desktop-wide
// dot).

import type { AgentOsImage } from '@/features/agentos/sessionClient'

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>

function tauriInvoke(): Invoke | null {
  const t = (window as unknown as { __TAURI__?: { core?: { invoke?: Invoke } } }).__TAURI__
  return t?.core?.invoke ?? null
}

/** True inside the desktop shell. */
export function inShell(): boolean {
  return tauriInvoke() !== null
}

/** The shell window this page is in: 'launcher' or 'dot' (from /hud?window=…), or null in a browser tab. */
export function shellWindow(): 'launcher' | 'dot' | null {
  if (!inShell()) return null
  const w = new URLSearchParams(window.location.search).get('window')
  return w === 'dot' ? 'dot' : 'launcher'
}

/** Every monitor as one JPEG, downscaled in the shell, for this one turn. Never written to disk (shell's
 *  `capture_screen`), and the gateway never stores it either. Null outside the shell or if it fails. */
export async function captureScreen(): Promise<AgentOsImage[] | null> {
  const invoke = tauriInvoke()
  if (!invoke) return null
  try {
    const shots = (await invoke('capture_screen')) as { mediaType: 'image/jpeg'; data: string }[]
    return shots.length ? shots.slice(0, 2) : null
  } catch (err) {
    console.warn('[hud] screenshot failed', err)
    return null
  }
}

const DOT_ON_KEY = 'hud.dotOn'

/** Whether the shell's dot window is showing (it says so itself, through localStorage, which both windows share):
 *  then the dot answers push-to-talk and the launcher stays out of it. */
export function dotWindowOn(): boolean {
  try {
    return inShell() && localStorage.getItem(DOT_ON_KEY) === '1'
  } catch {
    return false
  }
}
export function setDotWindowOn(on: boolean) {
  try {
    localStorage.setItem(DOT_ON_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Whether this page is where the operator is: a shell window that's showing, or the focused browser tab. The
 *  page in front claims a push-to-talk final at once; others wait a moment, so they only answer when nothing in
 *  front does. */
export async function inFront(): Promise<boolean> {
  const invoke = tauriInvoke()
  if (invoke) {
    try {
      return Boolean(await invoke('window_visible'))
    } catch {
      return !document.hidden
    }
  }
  return !document.hidden && document.hasFocus()
}

/** Ask the shell to show a mode's window (the launcher, or the dot); no-op in a browser. */
export async function showShellMode(mode: 'search' | 'chat' | 'dot'): Promise<void> {
  await tauriInvoke()?.('show_mode', { mode })
}

/** Hide this shell window (Esc, or the launcher losing focus); no-op in a browser. */
export async function hideShellWindow(): Promise<void> {
  await tauriInvoke()?.('hide_window')
}
