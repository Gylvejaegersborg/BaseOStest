// The local voice service (agent-os's voice/, phase 6): dictation in, speech back out.
//
// It runs on the machine with the mic at 127.0.0.1:8765 and is reached THROUGH this dev server at /voice/*, like
// the gateway at /agent-os/*: the Vite proxy adds the gateway token (every voice route but /health needs it), so
// the browser never holds it, and no web page can open the dictation socket on its own.
//
// ONE WebSocket for the whole app, opened when the first listener subscribes and closed with the last — the same
// rule as subscribeToEvents in sessionClient.ts. When the service isn't running it retries quietly, backing off
// to 30 s, so BaseSpace works the same without it.
//
// Push-to-talk is Ctrl+Alt+B, a global hotkey the voice service owns: it works with any window focused. Until the
// HUD window exists (hud/core), what you dictate lands in this app's launcher.

export type VoiceEvent =
  | { type: 'ptt_start'; t: number }
  | { type: 'ptt_end'; t: number; kept: boolean }
  | { type: 'speech_start'; t: number }
  /** Live English text while push-to-talk is held (the hold so far, re-read about twice a second); the final
   *  replaces it. Never for Norwegian. */
  | { type: 'partial'; text: string; n: number; language: 'en'; audio_s: number; transcribe_ms: number }
  | { type: 'speech_end'; t: number; kept: boolean }
  | { type: 'mode'; mode: VoiceMode }
  | { type: 'speak_start'; t: number }
  | { type: 'sentence'; text: string; language: string; engine: string; synth_ms: number }
  | { type: 'speak_end'; t: number; reason: 'done' | 'stop' | 'barge_in' | 'replaced' | 'cancel' }
  | { type: 'barge_in'; t: number }
  | { type: 'error'; error: string }
  | {
      type: 'final'
      text: string
      /** 'no' or 'en': the language tag that goes with the text. */
      language: string
      engine: string
      route: string
      detected: { language: string; prob: number; lang_id_ms: number | null } | null
      end_of_speech_to_final_ms: number
      trigger: 'push_to_talk' | 'always'
    }

export type VoiceMode = 'auto' | 'no' | 'en'
export type VoiceStatus = 'off' | 'connecting' | 'on'

const BASE = '/voice'
const listeners = new Set<(e: VoiceEvent) => void>()
const statusListeners = new Set<(s: VoiceStatus) => void>()
let socket: WebSocket | null = null
let retry: number | undefined
let backoff = 1000
let status: VoiceStatus = 'off'

function setStatus(s: VoiceStatus) {
  status = s
  for (const fn of statusListeners) fn(s)
}

function connect() {
  if (socket || listeners.size === 0) return
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${proto}//${location.host}${BASE}/v1/listen`)
  socket = ws
  setStatus('connecting')
  ws.onopen = () => {
    backoff = 1000
    setStatus('on')
  }
  ws.onmessage = (m) => {
    let e: VoiceEvent
    try {
      e = JSON.parse(String(m.data)) as VoiceEvent
    } catch {
      return
    }
    for (const fn of listeners) fn(e)
  }
  ws.onclose = () => {
    socket = null
    setStatus('off')
    if (listeners.size === 0) return
    retry = window.setTimeout(connect, backoff)
    backoff = Math.min(backoff * 2, 30_000)
  }
}

function disconnect() {
  window.clearTimeout(retry)
  socket?.close()
  socket = null
}

/** Every event from the voice service. Returns a disposer. */
export function subscribeToVoice(onEvent: (e: VoiceEvent) => void): () => void {
  listeners.add(onEvent)
  connect()
  return () => {
    listeners.delete(onEvent)
    if (listeners.size === 0) disconnect()
  }
}

export function subscribeToVoiceStatus(onStatus: (s: VoiceStatus) => void): () => void {
  statusListeners.add(onStatus)
  onStatus(status)
  return () => statusListeners.delete(onStatus)
}

async function control(body: Record<string, unknown>): Promise<{ muted: boolean; mode: VoiceMode; held: boolean }> {
  const res = await fetch(`${BASE}/v1/control`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`voice service: ${res.status} ${await res.text()}`)
  return res.json()
}

/** Push-to-talk from a button instead of the key (hold: true on press, false on release). */
export const setPushToTalk = (down: boolean) => control({ ptt: down })
export const setVoiceMode = (mode: VoiceMode) => control({ mode })

/** Speaks text on the voice service's machine (the one with the mic and speakers), sentence by sentence, each in
 *  its language's voice (Phonon 31M English, Piper Norwegian) — if speech back is on there (tts.enabled; off by default).
 *  Resolves false when it's off, so callers can just call it. Played there rather than in this tab so that pressing
 *  push-to-talk cuts it off (barge-in); speak_start / sentence / speak_end arrive on subscribeToVoice. `language`
 *  forces a voice; by default each sentence is detected. A new speak() replaces what's being said. */
export async function speak(text: string, language?: 'no' | 'en'): Promise<boolean> {
  const res = await fetch(`${BASE}/v1/speak`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: text, ...(language ? { language } : {}) }),
  })
  return res.ok
}

/** Stops speaking now and drops the rest. */
export async function stopSpeaking(): Promise<void> {
  await fetch(`${BASE}/v1/speak/stop`, { method: 'POST' })
}
