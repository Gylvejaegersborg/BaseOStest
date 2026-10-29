import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { runningTimerResults } from './commands'
import { allEntries, askResult, search } from './rank'
import { AnswerTitle, FormBody, ReplyBody, ResultAside, ResultIcon, TimerRing } from './renderers'
import { addAlias, cancelTimer, hideResult, recordPick, remainingOf, renameResult, timers, togglePin, usePrefs, useTimers } from './store'
import type { LauncherContext, LauncherSize, RendererKind, Result } from './types'

// The launcher: one window that grows on intent. Peek (bar + pinned chips)
// → Focus (6 results + the Ask row; also the AI mode) → Expanded (all,
// grouped by renderer). The search bar never moves; only the panel under it
// does, on interruptible springs.

const FOCUS_ROWS = 6
export const LAUNCHER_TOGGLE_EVENT = 'launcher:toggle'

const GROUP_LABEL: Record<RendererKind, string> = {
  answer: 'Answers',
  swatch: 'Colours',
  'timer-ring': 'Timers',
  form: 'Input',
  row: 'Commands',
  reply: 'Ask',
}
const GROUP_ORDER: RendererKind[] = ['answer', 'swatch', 'timer-ring', 'form', 'row', 'reply']

/** Alt+B is the HUD key (Alt+Space and Ctrl+Alt+Space are taken on the
 *  operator's machine). Matched by physical key, so it works on any layout.
 *  Ctrl+Alt+B is kept free for voice (hud/core): the strict modifier check
 *  below is what keeps it from opening the launcher too. */
function isToggleKey(e: KeyboardEvent): boolean {
  return e.code === 'KeyB' && e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey
}

interface Menu {
  result: Result
  x: number
  y: number
  mode: 'menu' | 'rename' | 'alias'
}

export function Launcher() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const prefs = usePrefs()
  const liveTimers = useTimers()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [hl, setHl] = useState(0)
  /** Index into the highlighted item's actions while the strip is open. */
  const [strip, setStrip] = useState<number | null>(null)
  /** Result id whose inline form is open. */
  const [formFor, setFormFor] = useState<string | null>(null)
  /** Set while Focus is in AI mode. */
  const [aiQuery, setAiQuery] = useState<string | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const spring: Transition = reduce ? { duration: 0.08 } : { type: 'spring', stiffness: 400, damping: 40, mass: 0.8 }

  // ── results ───────────────────────────────────────────────────────────
  const results = useMemo(() => search(query, prefs), [query, prefs, liveTimers])
  const visible = useMemo(() => {
    // Expanded groups by renderer, so the list is flattened in group order
    // and the highlight index matches what is on screen.
    const flat = (items: Result[]) => (expanded ? groupByRenderer(items).flatMap((g) => g.items) : items)
    if (!query.trim()) return expanded ? flat(allEntries(prefs)) : []
    const ask = askResult(query)
    const main = results.filter((r) => !r.fallback)
    const fallbacks = results.filter((r) => r.fallback)
    if (main.length === 0) return [ask, ...fallbacks]
    return [...flat(expanded ? main : main.slice(0, FOCUS_ROWS)), ask, ...fallbacks]
  }, [query, results, expanded, prefs])
  const size: LauncherSize = expanded ? 'expanded' : query.trim() || aiQuery ? 'focus' : 'peek'
  const current = visible[Math.min(hl, visible.length - 1)]

  useEffect(() => setHl(0), [query])
  useEffect(() => setStrip(null), [hl, query])

  const show = useCallback(() => {
    setOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])
  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setExpanded(false)
    setStrip(null)
    setFormFor(null)
    setAiQuery(null)
    setMenu(null)
  }, [])

  const flash = useCallback((text: string) => {
    setToast(text)
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2200)
  }, [])

  const ctx: LauncherContext = useMemo(
    () => ({
      close,
      navigate: (to) => {
        navigate(to)
        close()
      },
      copy: (text) => {
        navigator.clipboard?.writeText(text).then(
          () => flash(`Copied ${text.length > 32 ? text.slice(0, 32) + '…' : text}`),
          () => flash('Copy failed — clipboard blocked'),
        )
      },
      toast: flash,
      setQuery: (q) => {
        setQuery(q)
        setFormFor(null)
        requestAnimationFrame(() => inputRef.current?.focus())
      },
      ask: (q) => {
        setAiQuery(q)
        setExpanded(false)
      },
    }),
    [close, navigate, flash],
  )

  // ── global hotkey + timer completion ─────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isToggleKey(e)) return
      e.preventDefault()
      if (open) close()
      else show()
    }
    const onToggle = () => (open ? close() : show())
    window.addEventListener('keydown', onKey)
    window.addEventListener(LAUNCHER_TOGGLE_EVENT, onToggle)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(LAUNCHER_TOGGLE_EVENT, onToggle)
    }
  }, [open, show, close])

  useEffect(() => {
    if (!liveTimers.some((t) => t.endsAt !== null)) return
    const tick = window.setInterval(() => {
      const now = Date.now()
      for (const t of timers.get().list) {
        if (t.endsAt !== null && remainingOf(t, now) <= 0) {
          cancelTimer(t.id)
          flash(`${t.label} is done`)
          chime()
          notify(`${t.label} is done`)
        }
      }
    }, 500)
    return () => window.clearInterval(tick)
  }, [liveTimers, flash])

  // ── running a result ─────────────────────────────────────────────────
  const run = useCallback(
    (r: Result, actionIndex = 0) => {
      if (r.payload.kind === 'form' && actionIndex === 0) {
        setFormFor(r.id)
        return
      }
      const action = r.actions[actionIndex]
      if (!action) return
      recordPick(query, r.id)
      const keep = action.run(ctx)
      if (keep !== 'keep-open' && r.commandId !== 'ask') close()
      else setStrip(null)
    },
    [ctx, query, close],
  )

  const back = useCallback(() => {
    if (menu) return setMenu(null)
    if (formFor) return setFormFor(null)
    if (strip !== null) return setStrip(null)
    if (aiQuery !== null) return setAiQuery(null)
    if (expanded) return setExpanded(false)
    if (query) return setQuery('')
    close()
  }, [menu, formFor, strip, aiQuery, expanded, query, close])

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    const n = visible.length
    if (e.key === 'Escape' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault()
      back()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (n) setHl((h) => (h + 1) % n)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (n) setHl((h) => (h - 1 + n) % n)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Tab grows the window first; once expanded it steps into sub-actions.
      if (!expanded) setExpanded(true)
      else if (current && current.actions.length > 1) setStrip(0)
    } else if ((e.key === 'ArrowRight' && strip === null && inputAtEnd(e)) || (e.key === 'Enter' && e.ctrlKey && strip === null)) {
      if (current && current.actions.length > 0) {
        e.preventDefault()
        setStrip(current.actions.length > 1 ? 1 : 0)
      }
    } else if (strip !== null && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault()
      const len = current?.actions.length ?? 1
      setStrip((s) => ((s ?? 0) + (e.key === 'ArrowRight' ? 1 : -1) + len) % len)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim().startsWith('?')) return ctx.ask(query.trim().slice(1).trim())
      if (current) run(current, strip ?? 0)
    } else if (e.ctrlKey && /^[1-6]$/.test(e.key)) {
      e.preventDefault()
      const r = visible[Number(e.key) - 1]
      if (r) run(r)
    }
  }

  // ── Peek chips: pinned commands + running timers ─────────────────────
  const chips = useMemo(() => {
    const entries = allEntries(prefs)
    return prefs.pinned.flatMap((id) => entries.find((r) => r.id === id) ?? [])
  }, [prefs])
  const timerChips = useMemo(() => runningTimerResults(), [liveTimers])

  const rows: { kind: RendererKind | null; items: Result[] }[] = expanded ? groupByRenderer(visible) : [{ kind: null, items: visible }]

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[90] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            onMouseDown={close}
          />
        )}
        {open && (
          <motion.div
            key="launcher"
            role="dialog"
            aria-label="Launcher"
            className="fixed inset-x-0 top-[14vh] z-[95] mx-auto w-[min(680px,calc(100vw-32px))]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: spring }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
          >
            <motion.div
              layout
              transition={spring}
              className="hud-corners relative overflow-hidden rounded-xl border border-line-2 bg-panel/95 text-accent-3 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-md"
              style={{ borderRadius: 12 }}
            >
              {/* Search bar: anchored; only what's below it moves. */}
              <motion.div layout="position" className="flex h-14 items-center gap-3 border-b border-line px-4 text-text">
                {aiQuery !== null ? (
                  <button type="button" aria-label="Back to results" onClick={() => setAiQuery(null)} className="text-dim hover:text-text">
                    <ArrowLeft size={18} />
                  </button>
                ) : (
                  <Search size={18} className="text-dim" />
                )}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setFormFor(null)
                  }}
                  onKeyDown={onInputKey}
                  placeholder={aiQuery !== null ? 'Ask a follow-up…' : 'Type a command, a sum, a colour — or ? to ask'}
                  aria-label="Launcher search"
                  spellCheck={false}
                  className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-dim"
                />
                <span className="label hidden sm:inline">{aiQuery !== null ? 'AI mode' : size}</span>
              </motion.div>

              <AnimatePresence mode="popLayout" initial={false}>
                {size === 'peek' && (
                  <motion.div
                    key="peek"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    className="flex flex-wrap gap-2 px-4 py-3"
                  >
                    {chips.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => run(r)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setMenu({ result: r, x: e.clientX, y: e.clientY, mode: 'menu' })
                        }}
                        className="flex items-center gap-2 rounded-full border border-line-2 bg-panel-2 px-3 py-1 text-[12px] text-text hover:border-accent-4"
                      >
                        {r.icon && <r.icon size={13} className="text-dim" />}
                        {r.title}
                      </button>
                    ))}
                    {timerChips.map((r) =>
                      r.payload.kind === 'timer-ring' ? (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setQuery('timer')}
                          className="flex items-center gap-2 rounded-full border border-accent-5 bg-accent-5/20 px-2 py-0.5 text-[12px] text-text"
                        >
                          <TimerRing timerId={r.payload.timerId} durationMs={r.payload.durationMs} size={20} />
                        </button>
                      ) : null,
                    )}
                    <span className="ml-auto self-center text-[11px] text-dim">Tab for everything</span>
                  </motion.div>
                )}

                {aiQuery !== null && (
                  <motion.div key="ai" layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border-b border-line">
                    <ReplyBody query={aiQuery} />
                  </motion.div>
                )}

                {size !== 'peek' && (
                  <motion.div
                    key="list"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    className={cn('overflow-y-auto py-1.5', expanded ? 'max-h-[62vh]' : 'max-h-[440px]')}
                  >
                    <LayoutGroup id="launcher-rows">
                      {rows.map((group) => (
                        <div key={group.kind ?? 'all'}>
                          {group.kind && <div className="label px-4 pb-1 pt-2">{GROUP_LABEL[group.kind]}</div>}
                          <ul role="listbox" aria-label="Results">
                            {group.items.map((r) => {
                              const i = visible.indexOf(r)
                              const active = i === hl
                              const dimmed = (strip !== null || formFor !== null) && !active
                              return (
                                <motion.li
                                  key={r.id}
                                  layout="position"
                                  role="option"
                                  aria-selected={active}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: dimmed ? 0.4 : 1, y: 0, transition: reduce ? { duration: 0.08 } : { ...spring, delay: Math.min(i, 6) * 0.015 } }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="relative mx-1.5"
                                  onMouseMove={() => strip === null && formFor === null && setHl(i)}
                                  onClick={() => run(r)}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    setMenu({ result: r, x: e.clientX, y: e.clientY, mode: 'menu' })
                                  }}
                                >
                                  {active && (
                                    <motion.div
                                      layoutId="launcher-highlight"
                                      transition={reduce ? { duration: 0.06 } : { type: 'spring', stiffness: 700, damping: 45 }}
                                      className="absolute inset-0 rounded-lg border border-accent-5/70 bg-accent-5/15"
                                    />
                                  )}
                                  <div className={cn('relative flex min-h-[44px] cursor-default items-center gap-3 px-2.5', r.payload.kind === 'answer' && 'min-h-[56px]')}>
                                    <ResultIcon result={r} />
                                    <div className="min-w-0 flex-1">
                                      {r.payload.kind === 'answer' ? (
                                        <AnswerTitle value={r.payload.value} expression={r.payload.expression} />
                                      ) : (
                                        <>
                                          <div className="truncate text-[14px] text-text">{r.title}</div>
                                          {r.hint && <div className="truncate text-[12px] text-dim">{r.hint}</div>}
                                        </>
                                      )}
                                    </div>
                                    <ResultAside result={r} />
                                    {!expanded && i < FOCUS_ROWS && <kbd className="hidden font-mono text-[10px] text-dim sm:inline">Ctrl+{i + 1}</kbd>}
                                  </div>

                                  {/* Action strip: sub-actions never become their own rows. */}
                                  <AnimatePresence>
                                    {active && strip !== null && r.actions.length > 0 && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={spring}
                                        className="relative flex flex-wrap gap-1.5 px-12 pb-2.5"
                                      >
                                        {r.actions.map((a, ai) => (
                                          <button
                                            key={a.id}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              run(r, ai)
                                            }}
                                            className={cn(
                                              'rounded-md border px-2.5 py-1 text-[12px]',
                                              ai === strip ? 'border-accent-4 bg-accent-5/30 text-accent-1' : 'border-line-2 text-dim hover:text-text',
                                            )}
                                          >
                                            {a.label}
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {formFor === r.id && r.payload.kind === 'form' && (
                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                      <FormBody
                                        fields={r.payload.fields}
                                        submitLabel={r.payload.submitLabel}
                                        onSubmit={r.payload.onSubmit}
                                        onCancel={() => {
                                          setFormFor(null)
                                          inputRef.current?.focus()
                                        }}
                                        ctx={ctx}
                                      />
                                    </div>
                                  )}
                                </motion.li>
                              )
                            })}
                          </ul>
                        </div>
                      ))}
                    </LayoutGroup>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div layout="position" className="flex items-center gap-4 border-t border-line px-4 py-1.5 text-[11px] text-dim">
                <span>↑↓ move</span>
                <span>Enter run</span>
                <span>→ actions</span>
                <span>Tab {expanded ? 'sub-actions' : 'more'}</span>
                <span>Esc back</span>
                <span className="ml-auto flex items-center gap-1">
                  <Sparkles size={11} /> ? asks
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {menu && <CurationMenu menu={menu} setMenu={setMenu} pinned={prefs.pinned.includes(menu.result.id)} onDone={() => inputRef.current?.focus()} />}

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-6 z-[110] mx-auto w-fit rounded-lg border border-line-2 bg-panel px-4 py-2 text-[13px] text-text shadow-lg"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** Right-click on any result: hide, rename, alias, pin. */
function CurationMenu({ menu, setMenu, pinned, onDone }: { menu: Menu; setMenu: (m: Menu | null) => void; pinned: boolean; onDone: () => void }) {
  const [text, setText] = useState('')
  const r = menu.result
  const done = () => {
    setMenu(null)
    onDone()
  }
  const item = 'block w-full px-3 py-1.5 text-left hover:bg-panel-2'
  return (
    <>
      <div className="fixed inset-0 z-[100]" onMouseDown={done} onContextMenu={(e) => (e.preventDefault(), done())} />
      <div
        className="fixed z-[105] w-56 rounded-lg border border-line-2 bg-panel py-1 text-[13px] text-text shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
        style={{ left: Math.min(menu.x, window.innerWidth - 240), top: Math.min(menu.y, window.innerHeight - 180) }}
        onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), done())}
      >
        <div className="label truncate px-3 pb-1 pt-1.5">{r.title}</div>
        {menu.mode === 'menu' ? (
          <>
            <button type="button" className={item} onClick={() => (togglePin(r.id), done())}>
              {pinned ? 'Unpin from Peek' : 'Pin to Peek'}
            </button>
            <button type="button" className={item} onClick={() => setMenu({ ...menu, mode: 'rename' })}>
              Rename…
            </button>
            <button type="button" className={item} onClick={() => setMenu({ ...menu, mode: 'alias' })}>
              Add alias…
            </button>
            <button type="button" className={cn(item, 'text-crimson-2')} onClick={() => (hideResult(r.id), done())}>
              Hide (type “hidden” to bring back)
            </button>
          </>
        ) : (
          <form
            className="px-3 pb-2 pt-1"
            onSubmit={(e) => {
              e.preventDefault()
              if (menu.mode === 'rename') renameResult(r.id, text)
              else addAlias(r.id, text)
              done()
            }}
          >
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={menu.mode === 'rename' ? 'New name (empty resets)' : 'Alias, e.g. tm'}
              className="w-full rounded-md border border-line-2 bg-bg px-2 py-1.5 text-[13px] outline-none focus:border-accent-4"
            />
          </form>
        )}
      </div>
    </>
  )
}

function groupByRenderer(items: Result[]): { kind: RendererKind; items: Result[] }[] {
  return GROUP_ORDER.map((kind) => ({ kind, items: items.filter((r) => r.payload.kind === kind) })).filter((g) => g.items.length > 0)
}

function inputAtEnd(e: ReactKeyboardEvent<HTMLInputElement>): boolean {
  const el = e.currentTarget
  return el.selectionStart === el.value.length && el.selectionEnd === el.value.length
}

function chime() {
  try {
    const ac = new AudioContext()
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.15, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6)
    o.connect(g).connect(ac.destination)
    o.start()
    o.stop(ac.currentTime + 0.6)
  } catch {
    // No audio: the toast still shows.
  }
}

function notify(text: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(text)
  } catch {
    // Notifications are optional.
  }
}

