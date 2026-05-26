import { useEffect, useRef, useState } from 'react'

// One-bar (16 step) patterns for a generic, gentle preview groove.
const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0]
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
const HAT = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1]

/**
 * Synthesises a short drum-loop preview at a beat's BPM via the Web Audio API,
 * so previews need no audio files. Only one beat plays at a time.
 */
export function useBeatPreview() {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const noiseRef = useRef<AudioBuffer | null>(null)
  const timerRef = useRef<number | null>(null)
  const stepRef = useRef(0)
  const nextTimeRef = useRef(0)
  const bpmRef = useRef(120)

  const ensureCtx = (): AudioContext => {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctor()
      const master = ctx.createGain()
      master.gain.value = 0.28
      master.connect(ctx.destination)
      masterRef.current = master
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      noiseRef.current = buf
      ctxRef.current = ctx
    }
    return ctxRef.current
  }

  const kick = (ctx: AudioContext, t: number) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    osc.connect(g).connect(masterRef.current!)
    osc.start(t)
    osc.stop(t + 0.2)
  }

  const noiseHit = (ctx: AudioContext, t: number, hz: number, peak: number, decay: number) => {
    const src = ctx.createBufferSource()
    src.buffer = noiseRef.current
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = hz
    const g = ctx.createGain()
    g.gain.setValueAtTime(peak, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + decay)
    src.connect(hp).connect(g).connect(masterRef.current!)
    src.start(t)
    src.stop(t + decay + 0.02)
  }

  const scheduler = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    const stepDur = 60 / bpmRef.current / 4
    while (nextTimeRef.current < ctx.currentTime + 0.1) {
      const s = stepRef.current % 16
      const t = nextTimeRef.current
      if (KICK[s]) kick(ctx, t)
      if (SNARE[s]) noiseHit(ctx, t, 1500, 0.5, 0.18)
      if (HAT[s]) noiseHit(ctx, t, 7000, 0.2, 0.05)
      nextTimeRef.current += stepDur
      stepRef.current++
    }
  }

  const stop = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setPlayingId(null)
  }

  const toggle = (id: string, bpm: number) => {
    if (playingId === id) {
      stop()
      return
    }
    const ctx = ensureCtx()
    if (ctx.state === 'suspended') void ctx.resume()
    bpmRef.current = bpm
    stepRef.current = 0
    nextTimeRef.current = ctx.currentTime + 0.06
    if (timerRef.current !== null) clearInterval(timerRef.current)
    timerRef.current = window.setInterval(scheduler, 25)
    setPlayingId(id)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
      void ctxRef.current?.close()
    }
  }, [])

  return { playingId, toggle, stop }
}
