import { COMMANDS } from './commands'
import { frecencyScore, type Prefs } from './store'
import type { Command, Result, Runtime } from './types'

/** Which runtime we're in. The Tauri shell will set this; the browser can't. */
export const RUNTIME: Runtime = 'browser'

const available = (c: Command) => c.runtime === RUNTIME

/** Subsequence fuzzy match, 0 when it doesn't match. Rewards prefix hits,
 *  word starts and consecutive characters. */
export function fuzzy(query: string, text: string): number {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (!q) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 80 - Math.min(20, t.length - q.length)
  const wordStart = t.split(/[\s:/-]+/).some((w) => w.startsWith(q))
  if (wordStart) return 60
  let ti = 0
  let score = 0
  let run = 0
  for (const ch of q) {
    const found = t.indexOf(ch, ti)
    if (found < 0) return 0
    run = found === ti ? run + 1 : 0
    score += 1 + run * 2 + (found === 0 || /[\s:/-]/.test(t[found - 1]) ? 3 : 0)
    ti = found + 1
  }
  return Math.min(50, score)
}

export function applyPrefs(r: Result, prefs: Prefs): Result {
  const title = prefs.renamed[r.id]
  return title ? { ...r, title } : r
}

/** Every static entry the launcher knows, curated (hidden ones dropped). */
export function allEntries(prefs: Prefs): Result[] {
  return COMMANDS.filter((c) => available(c) && c.entry)
    .map((c) => applyPrefs(c.entry!(), prefs))
    .filter((r) => !prefs.hidden.includes(r.id))
}

interface Scored {
  result: Result
  score: number
}

/**
 * Rank, in order: exact alias match always wins, then frecency for this
 * query prefix, then (later) context boost, then fuzzy text score. Direct
 * answers (a sum, a colour, a timer) sit above plain matches.
 */
export function search(query: string, prefs: Prefs): Result[] {
  const q = query.trim()
  if (!q) return []
  const lower = q.toLowerCase()
  const scored: Scored[] = []

  for (const cmd of COMMANDS) {
    if (!available(cmd)) continue
    for (const r of cmd.parse?.(q) ?? []) {
      if (prefs.hidden.includes(r.id)) continue
      scored.push({ result: applyPrefs(r, prefs), score: (r.direct ? 500 : 0) + frecencyScore(q, r.id) * 10 })
    }
    if (!cmd.entry) continue
    const r = applyPrefs(cmd.entry(), prefs)
    if (prefs.hidden.includes(r.id)) continue
    const aliases = prefs.aliases[r.id] ?? []
    if (aliases.includes(lower)) {
      scored.push({ result: r, score: 1000 })
      continue
    }
    const text = Math.max(fuzzy(q, r.title), ...cmd.verbs.map((v) => fuzzy(q, v)), ...aliases.map((a) => fuzzy(q, a)))
    if (text > 0) scored.push({ result: r, score: text + frecencyScore(q, r.id) * 10 })
  }

  // One result per id (an entry and a parsed answer can share a command).
  const seen = new Set<string>()
  return scored
    .sort((a, b) => b.score - a.score)
    .map((s) => s.result)
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
}

/** The Ask row: always last in Focus, first when nothing else matches. */
export function askResult(query: string): Result {
  return {
    id: 'ask',
    commandId: 'ask',
    title: `Ask: ${query.trim()}`,
    hint: 'AI mode · ? to switch',
    payload: { kind: 'reply', query: query.trim() },
    actions: [{ id: 'ask', label: 'Ask', run: (ctx) => (ctx.ask(query.trim()), 'keep-open') }],
  }
}
