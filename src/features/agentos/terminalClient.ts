// Client for agent-os's in-OS terminals (gateway/terminal.ts): interactive
// Claude Code / shell sessions the gateway runs and BaseSpace displays.
// Output arrives over SSE (`output` events with {data}, `exit` with {code});
// keystrokes and resizes are small POSTs.

const BASE = import.meta.env.VITE_AGENT_OS_GATEWAY_URL?.replace(/\/$/, '')

export type TerminalProfile = 'claude' | 'shell'

export interface TerminalInfo {
  id: string
  profile: TerminalProfile
  title: string
  cwd: string
  createdAt: string
  cols: number
  rows: number
  exitCode?: number
}

export interface TerminalsState {
  enabled: boolean
  backend: 'node-pty' | 'script'
  terminals: TerminalInfo[]
}

async function call<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  if (!BASE) throw new Error('agent-os gateway not configured')
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? { accept: 'application/json' } : { 'content-type': 'application/json', accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? `HTTP ${res.status}`)
  return json as T
}

export const fetchTerminals = () => call<TerminalsState>('GET', '/terminals')
export const createTerminal = (profile: TerminalProfile, cols: number, rows: number) =>
  call<TerminalInfo>('POST', '/terminals', { profile, cols, rows })
export const closeTerminal = (id: string) => call<{ ok: true }>('DELETE', `/terminals/${encodeURIComponent(id)}`)
export const resizeTerminal = (id: string, cols: number, rows: number) =>
  call<{ ok: true }>('POST', `/terminals/${encodeURIComponent(id)}/resize`, { cols, rows })
export const sendTerminalInput = (id: string, data: string) =>
  call<{ ok: true }>('POST', `/terminals/${encodeURIComponent(id)}/input`, { data })

/** Attaches to a terminal's output. `onOutput(data, replay)` — `replay` is
 *  true for the first chunk after each (re)connect, which is the gateway's
 *  scrollback: the caller should clear its screen before writing it, or a
 *  reconnect would print everything twice. Returns a disposer. */
export function attachTerminal(
  id: string,
  onOutput: (data: string, replay: boolean) => void,
  onExit: (code: number) => void,
): () => void {
  if (!BASE) return () => {}
  const source = new EventSource(`${BASE}/terminals/${encodeURIComponent(id)}/stream`)
  let fresh = true
  source.onopen = () => {
    fresh = true
  }
  source.addEventListener('output', (ev) => {
    try {
      onOutput(JSON.parse((ev as MessageEvent).data).data, fresh)
      fresh = false
    } catch {
      /* ignore malformed frames */
    }
  })
  source.addEventListener('exit', (ev) => {
    try {
      onExit(JSON.parse((ev as MessageEvent).data).code)
    } catch {
      /* ignore */
    }
  })
  return () => source.close()
}
