import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Beat } from '@/data/beats'

const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0]
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
const HAT = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1]

const SYNTH_PREVIEW_SEC = 30
const FFT_SIZE = 256

type Mode = 'idle' | 'real' | 'synth'

export interface BeatPlayer {
  current: Beat | null
  playing: boolean
  /** 0..1 over the playing track (or synth preview). */
  progress: number
  currentTime: number
  duration: number
  shuffle: boolean
  /** Increments on every track change — drives the CD-swap animation. */
  swapToken: number
  /** AnalyserNode for the visualiser; may be null before the first user gesture. */
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  play: (beat: Beat) => void
  pause: () => void
  toggle: (beat: Beat) => void
  seek: (t01: number) => void
  next: () => void
  prev: () => void
  setShuffle: (on: boolean) => void
}

/**
 * Plays real same-origin MP3s through an AnalyserNode for visualiser data.
 * Falls back to a synthesised drum-loop preview (routed through the same
 * analyser) when a beat has no audio file or the file fails to load.
 */
export function useBeatPlayer(queue: Beat[]): BeatPlayer {
  const [current, setCurrent] = useState<Beat | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shuffle, setShuffleState] = useState(false)
  const [swapToken, setSwapToken] = useState(0)

  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaSrcRef = useRef<MediaElementAudioSourceNode | null>(null)
  const synthGainRef = useRef<GainNode | null>(null)
  const noiseBufRef = useRef<AudioBuffer | null>(null)

  const synthTimerRef = useRef<number | null>(null)
  const synthStepRef = useRef(0)
  const synthNextRef = useRef(0)
  const synthStartedAtRef = useRef(0)
  const bpmRef = useRef(120)

  const queueRef = useRef(queue)
  queueRef.current = queue
  const shuffleRef = useRef(shuffle)
  shuffleRef.current = shuffle
  const modeRef = useRef<Mode>('idle')
  const failedRef = useRef<Set<string>>(new Set())
  const currentRef = useRef<Beat | null>(null)
  currentRef.current = current
  const wantPlayingRef = useRef(false)

  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = 0.85
    master.connect(ctx.destination)

    const analyser = ctx.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.78
    analyser.connect(master)

    const synthGain = ctx.createGain()
    synthGain.gain.value = 0.32
    synthGain.connect(analyser)

    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    ctxRef.current = ctx
    masterRef.current = master
    analyserRef.current = analyser
    synthGainRef.current = synthGain
    noiseBufRef.current = buf

    if (!audioRef.current) {
      const el = new Audio()
      el.crossOrigin = 'anonymous'
      el.preload = 'auto'
      audioRef.current = el
      el.addEventListener('timeupdate', () => {
        if (modeRef.current !== 'real') return
        const t = el.currentTime || 0
        const d = el.duration || 0
        setCurrentTime(t)
        setDuration(d)
        setProgress(d > 0 ? t / d : 0)
      })
      el.addEventListener('loadedmetadata', () => {
        if (modeRef.current === 'real') setDuration(el.duration || 0)
      })
      el.addEventListener('ended', () => {
        if (modeRef.current === 'real') nextRef.current?.()
      })
      el.addEventListener('error', () => {
        const beat = currentRef.current
        if (beat) {
          failedRef.current.add(beat.id)
          if (wantPlayingRef.current) startSynth(beat)
        }
      })
    }
    return ctx
  }, [])

  const stopSynth = useCallback(() => {
    if (synthTimerRef.current !== null) {
      clearInterval(synthTimerRef.current)
      synthTimerRef.current = null
    }
  }, [])

  const kick = (ctx: AudioContext, t: number) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    osc.connect(g).connect(synthGainRef.current!)
    osc.start(t)
    osc.stop(t + 0.2)
  }

  const noiseHit = (ctx: AudioContext, t: number, hz: number, peak: number, decay: number) => {
    if (!noiseBufRef.current) return
    const src = ctx.createBufferSource()
    src.buffer = noiseBufRef.current
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = hz
    const g = ctx.createGain()
    g.gain.setValueAtTime(peak, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + decay)
    src.connect(hp).connect(g).connect(synthGainRef.current!)
    src.start(t)
    src.stop(t + decay + 0.02)
  }

  const synthTick = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const stepDur = 60 / bpmRef.current / 4
    while (synthNextRef.current < ctx.currentTime + 0.1) {
      const s = synthStepRef.current % 16
      const t = synthNextRef.current
      if (KICK[s]) kick(ctx, t)
      if (SNARE[s]) noiseHit(ctx, t, 1500, 0.5, 0.18)
      if (HAT[s]) noiseHit(ctx, t, 7000, 0.2, 0.05)
      synthNextRef.current += stepDur
      synthStepRef.current++
    }
    const elapsed = ctx.currentTime - synthStartedAtRef.current
    const d = SYNTH_PREVIEW_SEC
    setCurrentTime(elapsed)
    setDuration(d)
    setProgress(Math.min(1, elapsed / d))
    if (elapsed >= d) nextRef.current?.()
  }, [])

  const startSynth = useCallback(
    (beat: Beat) => {
      const ctx = ensureCtx()
      // Stop real audio cleanly.
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause()
      if (ctx.state === 'suspended') void ctx.resume()
      bpmRef.current = beat.bpm
      synthStepRef.current = 0
      synthNextRef.current = ctx.currentTime + 0.06
      synthStartedAtRef.current = ctx.currentTime
      stopSynth()
      synthTimerRef.current = window.setInterval(synthTick, 25)
      modeRef.current = 'synth'
      setPlaying(true)
    },
    [ensureCtx, stopSynth, synthTick],
  )

  const startReal = useCallback(
    async (beat: Beat) => {
      const ctx = ensureCtx()
      stopSynth()
      const el = audioRef.current!
      // Lazy-create the MediaElementSource exactly once; reuse across track swaps.
      if (!mediaSrcRef.current) {
        try {
          mediaSrcRef.current = ctx.createMediaElementSource(el)
          mediaSrcRef.current.connect(analyserRef.current!)
        } catch {
          // If creation fails, give up on the real path entirely.
          failedRef.current.add(beat.id)
          startSynth(beat)
          return
        }
      }
      if (ctx.state === 'suspended') void ctx.resume()
      const url = beat.audioFile!
      if (el.src !== window.location.origin + url && !el.src.endsWith(url)) {
        el.src = url
      }
      modeRef.current = 'real'
      try {
        await el.play()
        setPlaying(true)
      } catch {
        failedRef.current.add(beat.id)
        startSynth(beat)
      }
    },
    [ensureCtx, startSynth, stopSynth],
  )

  const play = useCallback(
    (beat: Beat) => {
      wantPlayingRef.current = true
      const changing = currentRef.current?.id !== beat.id
      if (changing) {
        setCurrent(beat)
        setProgress(0)
        setCurrentTime(0)
        setDuration(beat.durationSec)
        setSwapToken((n) => n + 1)
      }
      if (beat.audioFile && !failedRef.current.has(beat.id)) {
        void startReal(beat)
      } else {
        startSynth(beat)
      }
    },
    [startReal, startSynth],
  )

  const pause = useCallback(() => {
    wantPlayingRef.current = false
    if (modeRef.current === 'real' && audioRef.current) audioRef.current.pause()
    stopSynth()
    setPlaying(false)
  }, [stopSynth])

  const toggle = useCallback(
    (beat: Beat) => {
      if (currentRef.current?.id === beat.id && playing) {
        pause()
      } else {
        play(beat)
      }
    },
    [pause, play, playing],
  )

  const seek = useCallback((t01: number) => {
    const el = audioRef.current
    if (modeRef.current === 'real' && el && el.duration) {
      el.currentTime = Math.max(0, Math.min(el.duration, t01 * el.duration))
    }
    // Synth fallback doesn't support seek.
  }, [])

  // Forward-declared next() so callbacks above can reference it via a ref.
  const nextRef = useRef<(() => void) | null>(null)
  const prevRef = useRef<(() => void) | null>(null)

  const pickNeighbour = useCallback((dir: 1 | -1) => {
    const list = queueRef.current
    if (list.length === 0) return null
    const cur = currentRef.current
    if (!cur) return list[0]
    if (shuffleRef.current && list.length > 1) {
      let i = Math.floor(Math.random() * list.length)
      const idx = list.findIndex((b) => b.id === cur.id)
      if (i === idx) i = (i + 1) % list.length
      return list[i]
    }
    const idx = list.findIndex((b) => b.id === cur.id)
    const n = idx < 0 ? 0 : (idx + dir + list.length) % list.length
    return list[n]
  }, [])

  const next = useCallback(() => {
    const b = pickNeighbour(1)
    if (b) play(b)
  }, [pickNeighbour, play])

  const prev = useCallback(() => {
    const b = pickNeighbour(-1)
    if (b) play(b)
  }, [pickNeighbour, play])

  nextRef.current = next
  prevRef.current = prev

  const setShuffle = useCallback((on: boolean) => setShuffleState(on), [])

  // Initialise the "current" to the first beat in the queue (paused) for nice UI.
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0])
      setDuration(queue[0].durationSec)
    }
  }, [current, queue])

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      stopSynth()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      void ctxRef.current?.close()
    }
  }, [stopSynth])

  return useMemo(
    () => ({
      current,
      playing,
      progress,
      currentTime,
      duration,
      shuffle,
      swapToken,
      analyserRef,
      play,
      pause,
      toggle,
      seek,
      next,
      prev,
      setShuffle,
    }),
    [current, playing, progress, currentTime, duration, shuffle, swapToken, play, pause, toggle, seek, next, prev, setShuffle],
  )
}
