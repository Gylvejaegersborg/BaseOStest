import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, HelpCircle, Package, Play, RotateCcw, Sparkles, Trophy, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Wave } from './Wave'
import { Tournament } from './Tournament'
import { PackBuilder } from './PackBuilder'
import { KINDS, generateSounds, judgeSound, listSounds, soundStats, soundUrl, type Candidate, type SoundKind, type Stats, type Verdict } from './soundlabClient'

const SWIPE_PX = 90
const TOP_UP_AT = 2
const TOP_UP_COUNT = 8

export function SoundLabPage() {
  const [kind, setKind] = useState<SoundKind>('808')
  const [queue, setQueue] = useState<Candidate[]>([])
  const [kept, setKept] = useState<Candidate[]>([])
  const [maybe, setMaybe] = useState<Candidate[]>([])
  const [panel, setPanel] = useState<'kept' | 'maybe'>('kept')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [drag, setDrag] = useState(0)
  const [flying, setFlying] = useState<0 | -1 | 1>(0)
  const [showKept, setShowKept] = useState(false)
  const [rounds, setRounds] = useState(false)
  const [packing, setPacking] = useState(false)
  const history = useRef<{ c: Candidate; verdict: Verdict }[]>([])
  const player = useRef<HTMLAudioElement | null>(null)
  const preload = useRef<HTMLAudioElement | null>(null)
  const toppingUp = useRef(false)
  const dragStart = useRef<number | null>(null)

  const current = queue[0]
  const refreshStats = useCallback(() => soundStats().then(setStats).catch(() => {}), [])

  const topUp = useCallback(
    async (k: SoundKind, count = TOP_UP_COUNT) => {
      if (toppingUp.current) return
      toppingUp.current = true
      try {
        const fresh = await generateSounds(k, count)
        setQueue((q) => [...q, ...fresh.filter((f) => !q.some((x) => x.id === f.id))])
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        toppingUp.current = false
      }
    },
    [],
  )

  // Load a kind: its waiting sounds and the ones already kept; make some if none are waiting.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setQueue([])
    history.current = []
    ;(async () => {
      try {
        const [pending, accepted, maybes] = await Promise.all([listSounds(kind, 'pending'), listSounds(kind, 'accepted'), listSounds(kind, 'maybe')])
        if (cancelled) return
        setKept(accepted)
        setMaybe(maybes)
        setQueue(pending)
        void refreshStats()
        if (!pending.length) await topUp(kind, 12)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [kind, refreshStats, topUp])

  const play = useCallback(() => {
    if (!current) return
    const a = (player.current ??= new Audio())
    a.src = soundUrl(current.id)
    a.currentTime = 0
    void a.play().catch(() => {})
  }, [current])

  // Play each new card as it appears (once the page has had a tap, so the browser allows it).
  useEffect(() => {
    if (started && current) play()
  }, [current?.id, started]) // eslint-disable-line react-hooks/exhaustive-deps

  // Warm the next sound so the swipe feels instant.
  useEffect(() => {
    const next = queue[1]
    if (!next) return
    const a = (preload.current ??= new Audio())
    a.preload = 'auto'
    a.src = soundUrl(next.id)
  }, [queue[1]?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const decide = useCallback(
    (verdict: 'accepted' | 'maybe' | 'skipped') => {
      if (!current) return
      setStarted(true)
      const c = current
      history.current.push({ c, verdict })
      setFlying(verdict === 'accepted' ? 1 : verdict === 'skipped' ? -1 : 0)
      window.setTimeout(() => {
        setFlying(0)
        setDrag(0)
        setQueue((q) => {
          const rest = q.filter((x) => x.id !== c.id)
          if (rest.length <= TOP_UP_AT) void topUp(kind)
          return rest
        })
        if (verdict === 'accepted') setKept((k) => [...k, c])
        if (verdict === 'maybe') setMaybe((m) => [...m, c])
      }, 160)
      judgeSound(c.id, verdict).then(refreshStats, (e) => setError(e instanceof Error ? e.message : String(e)))
    },
    [current, kind, refreshStats, topUp],
  )

  const undo = useCallback(() => {
    const last = history.current.pop()
    if (!last) return
    setQueue((q) => [last.c, ...q.filter((x) => x.id !== last.c.id)])
    setKept((k) => k.filter((x) => x.id !== last.c.id))
    setMaybe((m) => m.filter((x) => x.id !== last.c.id))
    judgeSound(last.c.id, 'pending').then(refreshStats, (e) => setError(e instanceof Error ? e.message : String(e)))
  }, [refreshStats])

  const unkeep = (c: Candidate) => {
    setKept((k) => k.filter((x) => x.id !== c.id))
    judgeSound(c.id, 'pending').then(refreshStats, () => {})
  }

  // Keyboard: ← skip, → keep, ↓ or M maybe, space replay, Z undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (rounds || packing) return // the tournament and the pack builder have the keyboard
      if (e.key === 'ArrowRight') decide('accepted')
      else if (e.key === 'ArrowLeft') decide('skipped')
      else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'm') decide('maybe')
      else if (e.key === ' ') {
        e.preventDefault()
        setStarted(true)
        play()
      } else if (e.key.toLowerCase() === 'z') undo()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [decide, play, undo, rounds, packing])

  const total = stats?.total
  const mine = stats?.[kind]
  const swipeHint = drag > 30 ? 'accepted' : drag < -30 ? 'skipped' : null

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-bg px-4 pb-8 pt-4 font-mono text-text select-none">
      <header className="mb-3">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-sm tracking-wider">
            SOUND LAB <span className="ml-1 text-[9px] uppercase tracking-[0.2em] text-dim">your ears decide</span>
          </h1>
          <div className="flex items-center gap-3">
            {total && (
              <span className="text-[10px] tabular-nums text-dim">
                kept {total.accepted} · maybe {total.maybe}
              </span>
            )}
            <button onClick={() => setPacking(true)} className="flex items-center gap-1 border border-accent/50 px-2 py-1 text-[11px] text-accent hover:bg-accent/10">
              <Package size={12} /> Pack
            </button>
          </div>
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Kind of sound">
          {KINDS.map((k) => (
            <button
              key={k.id}
              role="tab"
              aria-selected={k.id === kind}
              onClick={() => setKind(k.id)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-sm border px-2 py-1 text-[11px] transition-colors',
                k.id === kind ? 'border-accent text-accent' : 'border-line text-dim hover:text-text',
              )}
            >
              {k.label}
              {(stats?.[k.id]?.accepted ?? 0) > 0 && <span className="ml-1 text-accent">{stats![k.id]!.accepted}</span>}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <p role="alert" className="mb-2 border border-red-400/40 px-2 py-1.5 text-[11px] text-red-400">
          {error}
        </p>
      )}

      <main className="flex flex-1 flex-col items-center justify-center">
        {loading ? (
          <p className="text-xs text-dim">Making sounds…</p>
        ) : !current ? (
          <div className="text-center">
            <p className="mb-3 text-xs text-dim">That was the last one for now.</p>
            <button onClick={() => void topUp(kind, 12)} className="inline-flex items-center gap-2 border border-accent/60 px-3 py-2 text-xs text-accent hover:bg-accent/10">
              <Sparkles size={14} /> Make 12 more
            </button>
          </div>
        ) : (
          <div className="w-full">
            <div
              role="group"
              aria-label={`Sound: ${current.label}`}
              onPointerDown={(e) => {
                dragStart.current = e.clientX
                ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
              }}
              onPointerMove={(e) => dragStart.current !== null && setDrag(e.clientX - dragStart.current)}
              onPointerUp={() => {
                const dx = drag
                dragStart.current = null
                if (dx > SWIPE_PX) decide('accepted')
                else if (dx < -SWIPE_PX) decide('skipped')
                else {
                  setDrag(0)
                  setStarted(true)
                  if (Math.abs(dx) < 6) play()
                }
              }}
              className={cn(
                'relative touch-pan-y rounded border bg-panel px-4 py-5 transition-[transform,opacity] duration-150',
                swipeHint === 'accepted' ? 'border-green-400/70' : swipeHint === 'skipped' ? 'border-red-400/70' : 'border-line',
                flying !== 0 && 'opacity-0',
              )}
              style={{ transform: `translateX(${flying ? flying * 320 : drag}px) rotate(${(flying ? flying * 14 : drag / 22).toFixed(1)}deg)`, transitionDuration: dragStart.current !== null ? '0ms' : undefined }}
            >
              {swipeHint && (
                <span className={cn('absolute right-3 top-3 text-[10px] uppercase tracking-widest', swipeHint === 'accepted' ? 'text-green-400' : 'text-red-400')}>
                  {swipeHint === 'accepted' ? 'keep' : 'skip'}
                </span>
              )}
              <p className="text-center font-display text-3xl leading-tight">{current.label}</p>
              <p className="mb-2 mt-1 text-center text-[10px] uppercase tracking-wider text-dim">{current.parentId ? 'a variation of one you kept' : 'new'}</p>
              <Wave id={current.id} />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setStarted(true)
                  play()
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="mx-auto mt-2 flex items-center gap-2 border border-line px-3 py-1.5 text-xs text-dim hover:text-text"
              >
                <Play size={13} /> {started ? 'Play again' : 'Tap to start'}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button onClick={() => decide('skipped')} aria-label="Skip" className="flex flex-col items-center gap-1 border border-red-400/40 py-3 text-red-400 hover:bg-red-400/10">
                <X size={20} /> <span className="text-[10px] uppercase tracking-wider">Skip</span>
              </button>
              <button onClick={() => decide('maybe')} aria-label="Maybe" className="flex flex-col items-center gap-1 border border-line py-3 text-dim hover:text-text">
                <HelpCircle size={20} /> <span className="text-[10px] uppercase tracking-wider">Maybe</span>
              </button>
              <button onClick={() => decide('accepted')} aria-label="Keep" className="flex flex-col items-center gap-1 border border-green-400/50 py-3 text-green-400 hover:bg-green-400/10">
                <Check size={20} /> <span className="text-[10px] uppercase tracking-wider">Keep</span>
              </button>
            </div>
            <p className="mt-3 text-center text-[10px] text-dim">
              swipe or ← skip · ↓ maybe · → keep · space replay · z undo · {queue.length} waiting
            </p>
          </div>
        )}
      </main>

      <footer className="mt-4 flex items-center justify-between text-[11px] text-dim">
        <button onClick={undo} className="flex items-center gap-1 hover:text-text">
          <RotateCcw size={12} /> Undo
        </button>
        <button onClick={() => setRounds(true)} disabled={kept.length < 2} title={kept.length < 2 ? 'Keep at least two sounds of this kind first' : 'Tournament: pick the better of two, round by round'} className="flex items-center gap-1 hover:text-text disabled:opacity-40">
          <Trophy size={12} /> Rounds
        </button>
        <button onClick={() => setShowKept((v) => !v)} className="hover:text-text">
          {showKept ? 'Hide' : 'Show'} kept {mine ? `(${mine.accepted})` : ''}
        </button>
      </footer>

      {packing && <PackBuilder onClose={() => setPacking(false)} />}

      {rounds && (
        <Tournament
          kind={kind}
          kindLabel={KINDS.find((k) => k.id === kind)?.label ?? kind}
          kept={kept}
          onClose={() => setRounds(false)}
          onDemoted={(demoted) => {
            setMaybe((m) => [...m, ...kept.filter((x) => demoted.includes(x.id))])
            setKept((k) => k.filter((x) => !demoted.includes(x.id)))
            setPanel('maybe')
            setShowKept(true)
            void refreshStats()
          }}
        />
      )}

      {showKept && (
        <div className="mt-2">
          <div className="mb-1 flex gap-1 text-[11px]" role="tablist" aria-label="Kept or maybe">
            {(['kept', 'maybe'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={panel === t}
                onClick={() => setPanel(t)}
                className={cn('rounded-sm border px-2 py-1', panel === t ? 'border-accent text-accent' : 'border-line text-dim hover:text-text')}
              >
                {t === 'kept' ? `Kept ${kept.length}` : `Maybe ${maybe.length}`}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-line border border-line">
            {(panel === 'kept' ? kept : maybe).length === 0 && (
              <li className="px-3 py-2 text-[11px] text-dim">{panel === 'kept' ? 'Nothing kept for this kind yet.' : 'Nothing in maybe for this kind.'}</li>
            )}
            {(panel === 'kept' ? kept : maybe).map((c) => (
              <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                <button
                  onClick={() => {
                    setStarted(true)
                    const a = (player.current ??= new Audio())
                    a.src = soundUrl(c.id)
                    void a.play().catch(() => {})
                  }}
                  aria-label={`Play ${c.label}`}
                  className="text-accent"
                >
                  <Play size={14} />
                </button>
                <span className="flex-1">{c.label}</span>
                {panel === 'kept' ? (
                  <button onClick={() => unkeep(c)} className="text-[10px] uppercase tracking-wider text-dim hover:text-red-400">
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMaybe((m) => m.filter((x) => x.id !== c.id))
                      setKept((k) => [...k, c])
                      judgeSound(c.id, 'accepted').then(refreshStats, (e) => setError(e instanceof Error ? e.message : String(e)))
                    }}
                    className="text-[10px] uppercase tracking-wider text-green-400 hover:text-green-300"
                  >
                    Keep
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
