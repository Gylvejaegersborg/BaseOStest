import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, RotateCcw, Trophy, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Wave } from './Wave'
import { judgeSound, soundUrl, type Candidate } from './soundlabClient'
import { currentMatch, pick, progress, ranking, roundsTotal, startTournament, type Tournament as TState } from './bracket'

interface Props {
  kindLabel: string
  kind: string
  kept: Candidate[]
  onClose: () => void
  /** Called with the ids moved to Maybe, so the page can update its list. */
  onDemoted: (ids: string[]) => void
}

const storeKey = (kind: string) => `soundlab:tournament:${kind}`

function load(kind: string, ids: string[]): { state: TState; past: TState[] } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey(kind)) ?? 'null')
    // Resume only if it's the same field of sounds (otherwise the kept list changed and the bracket would be wrong).
    if (raw && JSON.stringify([...raw.ids].sort()) === JSON.stringify([...ids].sort())) return { state: raw.state, past: raw.past ?? [] }
  } catch {
    /* no saved bracket */
  }
  return null
}

/** Tournament-style review of the sounds you kept: two at a time, pick the better, until one is left. */
export function Tournament({ kindLabel, kind, kept, onClose, onDemoted }: Props) {
  const ids = useMemo(() => kept.map((c) => c.id), [kept])
  const byId = useMemo(() => new Map(kept.map((c) => [c.id, c])), [kept])
  const [{ state, past }, setRun] = useState(() => load(kind, ids) ?? { state: startTournament(ids), past: [] as TState[] })
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [keepTop, setKeepTop] = useState(Math.min(4, ids.length))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const chain = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(storeKey(kind), JSON.stringify({ ids, state, past }))
    } catch {
      /* private mode: the bracket just won't survive a reload */
    }
  }, [kind, ids, state, past])

  const match = currentMatch(state)
  const total = roundsTotal(ids.length)
  const matchesThisRound = Math.floor(state.players.length / 2)
  const prog = progress(state, ids.length)

  const play = useCallback((id: string, then?: () => void) => {
    const a = (audio.current ??= new Audio())
    chain.current++
    const mine = chain.current
    a.onended = () => {
      if (chain.current !== mine) return
      setPlaying(null)
      then?.()
    }
    a.src = soundUrl(id)
    a.currentTime = 0
    setPlaying(id)
    void a.play().catch(() => setPlaying(null))
  }, [])

  /** A, a short breath, then B: so the ear compares them back to back. */
  const playPair = useCallback(() => {
    if (!match) return
    setStarted(true)
    play(match[0], () => window.setTimeout(() => play(match[1]), 350))
  }, [match, play])

  // Each new matchup plays itself once the page has had a tap.
  useEffect(() => {
    if (started && match) playPair()
    return () => {
      chain.current++
      audio.current?.pause()
    }
  }, [match?.[0], match?.[1], started]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = useCallback(
    (winner: string) => {
      if (!match) return
      setStarted(true)
      setRun((r) => ({ state: pick(r.state, winner), past: [...r.past, r.state] }))
    },
    [match],
  )
  const undo = useCallback(() => setRun((r) => (r.past.length ? { state: r.past[r.past.length - 1]!, past: r.past.slice(0, -1) } : r)), [])
  const again = () => {
    setRun({ state: startTournament(ids), past: [] })
    setStarted(true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && match) choose(match[0])
      else if (e.key === 'ArrowRight' && match) choose(match[1])
      else if (e.key === ' ') {
        e.preventDefault()
        playPair()
      } else if (e.key.toLowerCase() === 'z') undo()
      else if (e.key === 'Escape') onClose()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [match, choose, playPair, undo, onClose])

  const order = state.champion ? ranking(state, ids) : []

  const demote = async () => {
    const losers = order.slice(keepTop)
    setBusy(true)
    setError(null)
    try {
      for (const id of losers) await judgeSound(id, 'maybe')
      onDemoted(losers)
      try {
        localStorage.removeItem(storeKey(kind))
      } catch {
        /* nothing to clear */
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const card = (id: string, side: 'left' | 'right') => {
    const c = byId.get(id)
    return (
      <div
        key={id}
        className={cn('flex flex-col rounded border bg-panel p-3 transition-colors', playing === id ? 'border-accent' : 'border-line')}
      >
        <button
          onClick={() => {
            setStarted(true)
            chain.current++
            play(id)
          }}
          aria-label={`Play ${c?.label ?? id}`}
          className="text-left"
        >
          <p className="font-display text-xl leading-tight">{c?.label ?? id}</p>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-dim">{side === 'left' ? 'A' : 'B'}</p>
          <Wave id={id} />
        </button>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              setStarted(true)
              chain.current++
              play(id)
            }}
            className="flex items-center gap-1 border border-line px-2 py-1.5 text-[11px] text-dim hover:text-text"
          >
            <Play size={12} /> Play
          </button>
          <button onClick={() => choose(id)} className="flex-1 border border-green-400/50 py-1.5 text-[11px] uppercase tracking-wider text-green-400 hover:bg-green-400/10">
            This one
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg px-4 pb-8 pt-4 font-mono text-text select-none" role="dialog" aria-label={`Rounds: ${kindLabel}`}>
      <div className="mx-auto max-w-xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm tracking-wider">
            ROUNDS <span className="ml-1 text-[9px] uppercase tracking-[0.2em] text-dim">{kindLabel} · {ids.length} kept</span>
          </h2>
          <button onClick={onClose} aria-label="Close rounds" className="text-dim hover:text-text">
            <X size={18} />
          </button>
        </header>

        {ids.length < 2 ? (
          <p className="text-xs text-dim">Keep at least two sounds of this kind to run a tournament.</p>
        ) : !state.champion && match ? (
          <>
            <p className="mb-3 text-center text-[11px] text-dim" aria-live="polite">
              Round {state.round} of {total} · match {state.match + 1} of {matchesThisRound} · {prog.played}/{prog.total} decided
            </p>
            <div className="grid grid-cols-2 gap-3">
              {card(match[0], 'left')}
              {card(match[1], 'right')}
            </div>
            {!started && <p className="mt-3 text-center text-xs text-accent">Tap a card to start. Each matchup then plays A, then B.</p>}
            <p className="mt-4 text-center text-[10px] text-dim">← A wins · → B wins · space plays both · z undoes</p>
            <div className="mt-3 flex justify-between text-[11px] text-dim">
              <button onClick={undo} disabled={!past.length} className="flex items-center gap-1 hover:text-text disabled:opacity-40">
                <RotateCcw size={12} /> Undo
              </button>
              <button onClick={playPair} className="flex items-center gap-1 hover:text-text">
                <Play size={12} /> Play both
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2 text-accent">
              <Trophy size={18} />
              <p className="font-display text-xl">{byId.get(state.champion!)?.label}</p>
            </div>
            <p className="mb-2 text-[11px] text-dim">Your order, best first (by how far each got):</p>
            <ol className="divide-y divide-line border border-line">
              {order.map((id, i) => (
                <li key={id} className={cn('flex items-center gap-2 px-3 py-2 text-xs', i >= keepTop && 'opacity-50')}>
                  <span className="w-5 tabular-nums text-dim">{i + 1}</span>
                  <button onClick={() => { chain.current++; play(id) }} aria-label={`Play ${byId.get(id)?.label}`} className="text-accent">
                    <Play size={14} />
                  </button>
                  <span className="flex-1">{byId.get(id)?.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-dim">{id === state.champion ? 'winner' : `out in round ${state.eliminated[id]}`}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-2 text-dim">
                Keep the top
                <input
                  type="number"
                  min={1}
                  max={order.length}
                  value={keepTop}
                  onChange={(e) => setKeepTop(Math.min(order.length, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-14 border border-line bg-bg/60 px-2 py-1 text-text focus:border-accent/60 focus:outline-none"
                />
              </label>
              <button
                onClick={demote}
                disabled={busy || keepTop >= order.length}
                className="border border-accent/60 px-3 py-1.5 text-accent hover:bg-accent/10 disabled:opacity-40"
              >
                Move the rest to Maybe
              </button>
              <button onClick={again} className="px-3 py-1.5 text-dim hover:text-text">
                Run it again
              </button>
              <button onClick={undo} className="px-3 py-1.5 text-dim hover:text-text">
                Undo last pick
              </button>
            </div>
            <p className="mt-2 text-[10px] text-dim">Nothing is deleted: they go to the Maybe tab, where you can keep any of them again.</p>
            {error && <p role="alert" className="mt-2 text-[11px] text-red-400">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
