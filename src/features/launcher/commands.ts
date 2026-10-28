import {
  AppWindow,
  ArrowLeftRight,
  Calculator,
  Database,
  EyeOff,
  FolderSearch,
  Globe,
  Palette,
  SquareTerminal,
  StickyNote,
  Timer as TimerIcon,
  ToggleRight,
} from 'lucide-react'
import { SECTIONS } from '@/data/sections'
import { calculate, convert, describeColour, formatDuration, formatNumber, parseColour, parseDuration } from './parse'
import { addInboxNote, addToTimer, cancelTimer, pauseTimer, prefs, remainingOf, startTimer, timers, unhideResult } from './store'
import type { Command, LauncherContext, Result } from './types'

// The curated command set. Flat: no categories, one entry per command,
// English verb first with the Norwegian one beside it. `shell` commands are
// declared so the inventory is visible, but stay hidden until the Tauri
// shell can run them.

const WEB_SEARCH = 'https://www.google.com/search?q='

/** Strip a leading verb ("timer 25m" → "25m"). */
function argAfter(query: string, verbs: string[]): string | null {
  const q = query.trim()
  const lower = q.toLowerCase()
  for (const v of verbs) {
    if (lower === v) return ''
    if (lower.startsWith(v + ' ')) return q.slice(v.length + 1).trim()
  }
  return null
}

const copyAction = (label: string, text: string) => ({
  id: `copy-${label.toLowerCase()}`,
  label: `Copy ${label}`,
  run: (ctx: LauncherContext) => ctx.copy(text),
})

const prefill = (q: string) => (ctx: LauncherContext) => {
  ctx.setQuery(q)
  return 'keep-open' as const
}

function timerResult(id: string): Result | null {
  const t = timers.get().list.find((x) => x.id === id)
  if (!t) return null
  return {
    id: `timer:${t.id}`,
    commandId: 'timer',
    title: t.label,
    hint: t.endsAt === null ? `Paused · ${formatDuration(remainingOf(t))} left` : 'Running',
    icon: TimerIcon,
    payload: { kind: 'timer-ring', timerId: t.id, durationMs: t.durationMs, label: t.label },
    direct: true,
    actions: [
      { id: 'pause', label: t.endsAt === null ? 'Resume' : 'Pause', run: () => (pauseTimer(t.id), 'keep-open') },
      { id: 'add-5m', label: '+5 min', run: () => (addToTimer(t.id, 300_000), 'keep-open') },
      { id: 'cancel', label: 'Cancel', run: () => cancelTimer(t.id) },
    ],
  }
}

/** Running timers, so "timer" lists what is already counting down. */
export function runningTimerResults(): Result[] {
  return timers.get().list.flatMap((t) => timerResult(t.id) ?? [])
}

const pageCommands: Command[] = SECTIONS.map((s) => ({
  id: `page:${s.id}`,
  title: s.label,
  verbs: ['open', 'åpne', s.label.toLowerCase(), s.id],
  icon: s.icon,
  runtime: 'browser',
  hint: s.blurb,
  entry: () => ({
    id: `page:${s.id}`,
    commandId: `page:${s.id}`,
    title: s.label,
    hint: s.blurb,
    icon: s.icon,
    payload: { kind: 'row' },
    actions: [{ id: 'open', label: 'Open', run: (ctx) => ctx.navigate(s.route) }],
  }),
}))

export const COMMANDS: Command[] = [
  {
    id: 'calc',
    title: 'Calculator',
    verbs: ['calculator', 'kalkulator', 'calc', '='],
    icon: Calculator,
    runtime: 'browser',
    hint: 'Type a sum: 2,5*4 or (12+8)/3',
    entry: () => ({
      id: 'cmd:calc',
      commandId: 'calc',
      title: 'Calculator',
      hint: 'Type a sum, e.g. 2,5*4',
      icon: Calculator,
      payload: { kind: 'row' },
      actions: [{ id: 'start', label: 'Start', run: prefill('=') }],
    }),
    parse: (query) => {
      const v = calculate(query)
      if (v === null) return []
      const value = formatNumber(v)
      return [
        {
          id: 'calc:answer',
          commandId: 'calc',
          title: value,
          hint: query.replace(/^=/, '').trim(),
          icon: Calculator,
          payload: { kind: 'answer', value, expression: query.replace(/^=/, '').trim() },
          direct: true,
          actions: [copyAction('result', String(parseFloat(v.toPrecision(12)))), copyAction('with expression', `${query.replace(/^=/, '').trim()} = ${value}`)],
        },
      ]
    },
  },
  {
    id: 'convert',
    title: 'Convert units',
    verbs: ['convert', 'konverter'],
    icon: ArrowLeftRight,
    runtime: 'browser',
    hint: '10 km to mi · 72 f in c · 5 kg til lb',
    parse: (query) => {
      const c = convert(query)
      if (!c) return []
      const value = `${formatNumber(c.result)} ${c.to}`
      return [
        {
          id: 'convert:answer',
          commandId: 'convert',
          title: value,
          hint: `${formatNumber(c.value)} ${c.from}`,
          icon: ArrowLeftRight,
          payload: { kind: 'answer', value, expression: `${formatNumber(c.value)} ${c.from} =` },
          direct: true,
          actions: [copyAction('result', String(parseFloat(c.result.toPrecision(12))))],
        },
      ]
    },
  },
  {
    id: 'colour',
    title: 'Colour',
    verbs: ['colour', 'color', 'farge', 'pick'],
    icon: Palette,
    runtime: 'browser',
    hint: 'Paste #hex, rgb() or hsl(), or pick from screen',
    entry: () => ({
      id: 'cmd:colour',
      commandId: 'colour',
      title: 'Colour picker',
      hint: 'Pick from screen, or type #hex / rgb() / hsl()',
      icon: Palette,
      payload: { kind: 'row' },
      actions: [{ id: 'pick', label: 'Pick from screen', run: pickColour }, { id: 'type', label: 'Type a colour', run: prefill('#') }],
    }),
    parse: (query) => {
      const arg = argAfter(query, ['colour', 'color', 'farge']) ?? query
      const c = parseColour(arg)
      if (!c) return []
      return [
        {
          id: 'colour:answer',
          commandId: 'colour',
          title: c.hex,
          hint: `${c.rgb} · ${c.hsl}`,
          icon: Palette,
          payload: { kind: 'swatch', ...c },
          direct: true,
          actions: [copyAction('HEX', c.hex), copyAction('RGB', c.rgb), copyAction('HSL', c.hsl)],
        },
      ]
    },
  },
  {
    id: 'timer',
    title: 'Timer',
    verbs: ['timer', 'countdown', 'nedtelling'],
    icon: TimerIcon,
    runtime: 'browser',
    hint: 'timer 25m · timer 1h30m · timer 1:30',
    entry: () => ({
      id: 'cmd:timer',
      commandId: 'timer',
      title: 'Timer',
      hint: 'timer 25m, 1h30m, 90s',
      icon: TimerIcon,
      payload: { kind: 'row' },
      actions: [{ id: 'start', label: 'Set a timer', run: prefill('timer ') }],
    }),
    parse: (query) => {
      const arg = argAfter(query, ['timer', 'countdown', 'nedtelling'])
      if (arg === null) return []
      const running = runningTimerResults()
      const ms = parseDuration(arg)
      if (!ms) return running
      const label = `Timer ${formatDuration(ms)}`
      const start: Result = {
        id: 'timer:new',
        commandId: 'timer',
        title: `Start ${label}`,
        hint: 'Enter to start',
        icon: TimerIcon,
        payload: { kind: 'timer-ring', durationMs: ms, label },
        direct: true,
        actions: [
          {
            id: 'start',
            label: 'Start',
            run: (ctx) => {
              startTimer(ms, label)
              ctx.toast(`${label} started`)
            },
          },
        ],
      }
      return [start, ...running]
    },
  },
  {
    id: 'note',
    title: 'Quick note',
    verbs: ['note', 'notat', 'inbox'],
    icon: StickyNote,
    runtime: 'browser',
    hint: 'Saved to the launcher inbox (BaseSpace notes later)',
    entry: () => ({
      id: 'cmd:note',
      commandId: 'note',
      title: 'Quick note',
      hint: 'To the launcher inbox',
      icon: StickyNote,
      payload: {
        kind: 'form',
        submitLabel: 'Save note',
        fields: [{ id: 'text', label: 'Note', placeholder: 'What do you want to remember?', multiline: true }],
        onSubmit: (values, ctx) => {
          if (!values.text?.trim()) return
          addInboxNote(values.text.trim())
          ctx.toast('Saved to inbox')
          ctx.close()
        },
      },
      actions: [],
    }),
    parse: (query) => {
      const arg = argAfter(query, ['note', 'notat'])
      if (!arg) return []
      return [
        {
          id: 'note:quick',
          commandId: 'note',
          title: `Save “${arg}”`,
          hint: 'Quick note to the launcher inbox',
          icon: StickyNote,
          payload: { kind: 'row' },
          direct: true,
          actions: [
            {
              id: 'save',
              label: 'Save',
              run: (ctx) => {
                addInboxNote(arg)
                ctx.toast('Saved to inbox')
              },
            },
          ],
        },
      ]
    },
  },
  {
    id: 'web',
    title: 'Web search',
    verbs: ['search', 'søk', 'google', 'web'],
    icon: Globe,
    runtime: 'browser',
    parse: (query) => {
      const arg = argAfter(query, ['search', 'søk', 'google', 'web']) ?? query.trim()
      if (!arg) return []
      return [
        {
          id: 'web:search',
          commandId: 'web',
          title: `Search the web for “${arg}”`,
          icon: Globe,
          payload: { kind: 'row' },
          fallback: true,
          actions: [{ id: 'open', label: 'Search', run: () => void window.open(WEB_SEARCH + encodeURIComponent(arg), '_blank', 'noopener') }],
        },
      ]
    },
  },
  {
    id: 'hidden',
    title: 'Hidden commands',
    verbs: ['hidden', 'skjulte', 'unhide'],
    icon: EyeOff,
    runtime: 'browser',
    parse: (query) => {
      if (argAfter(query, ['hidden', 'skjulte', 'unhide']) === null) return []
      return prefs.get().hidden.map((id) => ({
        id: `unhide:${id}`,
        commandId: 'hidden',
        title: `Unhide ${id.replace(/^\w+:/, '')}`,
        hint: id,
        icon: EyeOff,
        payload: { kind: 'row' as const },
        direct: true,
        actions: [{ id: 'unhide', label: 'Unhide', run: () => (unhideResult(id), 'keep-open' as const) }],
      }))
    },
  },
  ...pageCommands,
  // Need the Tauri shell (Phase 5). Declared, not shown in the browser.
  { id: 'apps', title: 'Launch apps', verbs: ['open', 'launch', 'start'], icon: AppWindow, runtime: 'shell' },
  { id: 'files', title: 'File search', verbs: ['find', 'file', 'fil'], icon: FolderSearch, runtime: 'shell' },
  { id: 'terminal', title: 'Terminal profiles', verbs: ['terminal', 'wt'], icon: SquareTerminal, runtime: 'shell' },
  { id: 'registry', title: 'Registry and services', verbs: ['registry', 'service', 'tjeneste'], icon: Database, runtime: 'shell' },
  { id: 'powertoys', title: 'PowerToys controls', verbs: ['powertoys', 'pt'], icon: ToggleRight, runtime: 'shell' },
]

interface EyeDropperCtor {
  new (): { open: () => Promise<{ sRGBHex: string }> }
}

/** Chromium's EyeDropper picks from anywhere on screen while the tab has focus. */
function pickColour(ctx: LauncherContext) {
  const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper
  if (!Ctor) {
    ctx.toast('This browser has no screen colour picker; type a colour instead')
    ctx.setQuery('#')
    return 'keep-open' as const
  }
  new Ctor()
    .open()
    .then(({ sRGBHex }) => {
      const c = parseColour(sRGBHex) ?? describeColour(0, 0, 0)
      ctx.setQuery(c.hex)
    })
    .catch(() => {})
  return 'keep-open' as const
}
