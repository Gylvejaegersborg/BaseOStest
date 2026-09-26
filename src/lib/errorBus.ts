import { useSyncExternalStore } from 'react'

// Everything that fails inside BaseSpace lands here and surfaces in Ops:
// uncaught errors, rejected promises, console.error, failed network calls
// (via a fetch wrapper) and explicit reports (e.g. storage writes that
// failed). Duplicates are folded into one entry with a count.

export type Severity = 'error' | 'warn' | 'info'

export interface AppError {
  id: string
  severity: Severity
  source: string
  message: string
  context?: string
  stack?: string
  count: number
  firstSeen: string
  lastSeen: string
}

const KEY = 'os:errors'
const MAX = 150

function load(): AppError[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as AppError[]
  } catch {
    return []
  }
}

let errors: AppError[] = load()
const listeners = new Set<() => void>()
let saveTimer: number | null = null

let notifyQueued = false

function emit() {
  // Notify asynchronously: errors are often reported from inside a React
  // render (console.error warnings), where updating subscribers directly
  // would trigger yet another warning.
  if (!notifyQueued) {
    notifyQueued = true
    window.setTimeout(() => {
      notifyQueued = false
      listeners.forEach((l) => l())
    }, 0)
  }
  if (saveTimer != null) return
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    try {
      localStorage.setItem(KEY, JSON.stringify(errors))
    } catch {
      /* storage full — keep in memory only */
    }
  }, 500)
}

export function reportError(e: { severity?: Severity; source: string; message: string; context?: string; stack?: string }) {
  const severity = e.severity ?? 'error'
  const message = e.message.slice(0, 500)
  const now = new Date().toISOString()
  const hit = errors.find((x) => x.source === e.source && x.message === message && x.severity === severity)
  if (hit) {
    errors = [{ ...hit, count: hit.count + 1, lastSeen: now, context: e.context ?? hit.context, stack: e.stack ?? hit.stack }, ...errors.filter((x) => x !== hit)]
  } else {
    const id = `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    errors = [{ id, severity, source: e.source, message, context: e.context, stack: e.stack, count: 1, firstSeen: now, lastSeen: now }, ...errors].slice(0, MAX)
  }
  emit()
}

export function dismissError(id: string) {
  errors = errors.filter((e) => e.id !== id)
  emit()
}

export function clearErrors() {
  errors = []
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAppErrors(): AppError[] {
  return useSyncExternalStore(subscribe, () => errors)
}

const text = (v: unknown) => (v instanceof Error ? v.message : typeof v === 'string' ? v : (() => {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
})())

let installed = false

/** Hooks the global failure points. Call once at startup. */
export function installErrorCapture() {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('error', (e) => {
    reportError({ source: 'runtime', message: e.message || 'Uncaught error', context: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined, stack: e.error?.stack })
  })
  window.addEventListener('unhandledrejection', (e) => {
    reportError({ source: 'promise', message: `Unhandled rejection: ${text(e.reason)}`, stack: e.reason instanceof Error ? e.reason.stack : undefined })
  })

  const origError = console.error.bind(console)
  let inConsole = false
  console.error = (...args: unknown[]) => {
    origError(...args)
    if (inConsole) return
    inConsole = true
    try {
      const first = args.map(text).join(' ')
      reportError({ source: 'console', message: first.split('\n')[0] || 'console.error', context: first.length > 200 ? first.slice(0, 2000) : undefined })
    } finally {
      inConsole = false
    }
  }

  const agentOs = import.meta.env.VITE_AGENT_OS_GATEWAY_URL as string | undefined
  const sourceFor = (url: string) => {
    try {
      const u = new URL(url, window.location.href)
      if (agentOs && url.startsWith(agentOs)) return 'agent-os'
      if (u.origin === window.location.origin) return 'basespace'
      return u.hostname.replace(/^www\./, '')
    } catch {
      return 'network'
    }
  }
  const origFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    // Ops' own reachability pings (HEAD, opaque) report their own result.
    const quiet = method === 'HEAD'
    try {
      const res = await origFetch(input, init)
      if (!quiet && !res.ok && res.type !== 'opaque') {
        reportError({
          severity: res.status >= 500 ? 'error' : 'warn',
          source: sourceFor(url),
          message: `${method} ${res.status} ${res.statusText || ''}`.trim() + ` — ${new URL(url, window.location.href).pathname}`,
          context: url,
        })
      }
      return res
    } catch (err) {
      const name = (err as Error)?.name
      if (!quiet && name !== 'AbortError') {
        reportError({
          severity: name === 'TimeoutError' ? 'warn' : 'error',
          source: sourceFor(url),
          message: `${method} failed: ${text(err)}`,
          context: url,
        })
      }
      throw err
    }
  }
}
