import type { LucideIcon } from 'lucide-react'

/** The window grows on intent: Peek (bar + chips), Focus (6 rows, and the
 *  AI mode), Expanded (everything, grouped by renderer). */
export type LauncherSize = 'peek' | 'focus' | 'expanded'

/** Where a command can run. `shell` commands need the Tauri shell (apps,
 *  files, PowerToys…) and stay hidden in the browser until it exists. */
export type Runtime = 'browser' | 'shell'

export interface FormField {
  id: string
  label: string
  placeholder?: string
  multiline?: boolean
}

/** A result is data; a renderer from the fixed catalogue draws it. The same
 *  catalogue is the vocabulary AI replies may compose from later. */
export type Payload =
  | { kind: 'row' }
  | { kind: 'answer'; value: string; expression: string }
  | { kind: 'swatch'; hex: string; rgb: string; hsl: string }
  | { kind: 'timer-ring'; timerId?: string; durationMs: number; label: string }
  | { kind: 'form'; fields: FormField[]; submitLabel: string; onSubmit: (values: Record<string, string>, ctx: LauncherContext) => void }
  | { kind: 'reply'; query: string }

export type RendererKind = Payload['kind']

export interface LauncherContext {
  close: () => void
  navigate: (to: string) => void
  copy: (text: string) => void
  toast: (text: string) => void
  /** Replace the query, e.g. a chip that prefills "timer ". */
  setQuery: (q: string) => void
  /** Switch Focus into AI mode with this query as the first turn. */
  ask: (q: string) => void
}

export interface Action {
  id: string
  label: string
  /** Return 'keep-open' to leave the launcher open after running. */
  run: (ctx: LauncherContext) => void | 'keep-open'
}

export interface Result {
  /** Stable per result, used for frecency and curation. */
  id: string
  commandId: string
  title: string
  hint?: string
  icon?: LucideIcon
  payload: Payload
  /** First = default (Enter); the rest live in the action strip. */
  actions: Action[]
  /** Parsed answers (a calculation, a colour) outrank plain matches. */
  direct?: boolean
  /** Catch-alls (web search) that match anything: listed after Ask. */
  fallback?: boolean
}

export interface Command {
  id: string
  title: string
  /** English first, Norwegian beside it. */
  verbs: string[]
  icon: LucideIcon
  runtime: Runtime
  hint?: string
  /** Static entry: shown when the query fuzzy-matches the title/verbs. */
  entry?: () => Result
  /** Dynamic: parses the query and may return direct answers. */
  parse?: (query: string) => Result[]
}
