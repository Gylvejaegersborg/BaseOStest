// The HUD's state, shared by its two launcher modes (chat, dot): one agent (Hemera unless changed), one Agent-OS
// session titled "HUD" per agent (an ordinary session: memory, focus and learning work as in the Workbench), the
// voice service's push-to-talk, and what's on screen.
//
// - Push-to-talk (Ctrl+Alt+B, owned by the voice service): partials show live; the final is sent as a turn,
//   tagged with its language. In dot mode each press also takes a screenshot (inside the desktop shell), which
//   goes with that one turn and is never stored.
// - "Serves": when the window in front matches a project or goal, the session's focus follows it, so the agent
//   gets the goal chain, linked notes and open todos. The operator can turn that off for the session.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAgentOsChat } from '@/features/agentos/useAgentOsChat'
import type { AgentOsImage, AgentOsSessionFocus } from '@/features/agentos/sessionClient'
import { speak, subscribeToVoice, subscribeToVoiceStatus, type VoiceStatus } from '@/features/voice/voiceClient'
import { captureScreen } from './shell'
import { useDesktopFocus } from './useDesktopFocus'

export const HUD_SESSION_TITLE = 'HUD'
const AGENT_KEY = 'hud.agent'
const SPEAK_KEY = 'hud.speakReplies'
const SERVES_KEY = 'hud.followFocus'

function load(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private window: the choice just isn't remembered */
  }
}

export type HudPhase = 'idle' | 'listening' | 'thinking' | 'answering'

export function useHud(opts: { active: boolean; screenshots: boolean }) {
  const [agentId, setAgentIdState] = useState(() => load(AGENT_KEY, 'hemera'))
  const chat = useAgentOsChat(agentId, null, { sessionTitle: HUD_SESSION_TITLE })
  const focus = useDesktopFocus()

  const [voice, setVoice] = useState<VoiceStatus>('off')
  const [listening, setListening] = useState(false)
  const [partial, setPartial] = useState('')
  const [lastHeard, setLastHeard] = useState<{ text: string; language: string } | null>(null)
  const [speakReplies, setSpeakRepliesState] = useState(() => load(SPEAK_KEY, 'off') === 'on')
  const [followFocus, setFollowFocusState] = useState(() => load(SERVES_KEY, 'on') === 'on')
  const shot = useRef<Promise<AgentOsImage[] | null> | null>(null)

  const setAgentId = useCallback((id: string) => {
    setAgentIdState(id)
    save(AGENT_KEY, id)
  }, [])
  const setSpeakReplies = useCallback((on: boolean) => {
    setSpeakRepliesState(on)
    save(SPEAK_KEY, on ? 'on' : 'off')
  }, [])
  const setFollowFocus = useCallback((on: boolean) => {
    setFollowFocusState(on)
    save(SERVES_KEY, on ? 'on' : 'off')
  }, [])

  const ask = useCallback(
    async (text: string, images?: AgentOsImage[] | null) => {
      if (!text.trim()) return
      await chat.send(text.trim(), false, images ?? undefined)
    },
    [chat.send],
  )

  // Push-to-talk → partials → a turn. Only while a HUD mode is open, so search mode's dictation stays its own.
  const optsRef = useRef(opts)
  optsRef.current = opts
  const askRef = useRef(ask)
  askRef.current = ask
  useEffect(() => subscribeToVoiceStatus(setVoice), [])
  useEffect(() => {
    if (!opts.active) return
    return subscribeToVoice((e) => {
      if (e.type === 'ptt_start') {
        setListening(true)
        setPartial('')
        // The screen as it is when the key goes down: that's what "this" refers to.
        shot.current = optsRef.current.screenshots ? captureScreen() : null
      } else if (e.type === 'partial') {
        setPartial(e.text)
      } else if (e.type === 'ptt_end') {
        setListening(false)
        if (!e.kept) {
          setPartial('')
          shot.current = null
        }
      } else if (e.type === 'final' && e.trigger === 'push_to_talk') {
        setPartial('')
        setLastHeard({ text: e.text, language: e.language })
        const images = shot.current
        shot.current = null
        void (async () => askRef.current(`[voice, ${e.language}] ${e.text}`, images ? await images : null))()
      }
    })
  }, [opts.active])

  // The session follows the window in front, unless turned off.
  const session = chat.sessions.find((s) => s.id === chat.sessionId)
  const serves = focus?.serves ?? null
  useEffect(() => {
    if (!followFocus || !chat.sessionId || !serves) return
    const current = session?.focus
    if (current && current.kind === serves.kind && current.id === serves.id) return
    const next: AgentOsSessionFocus = { kind: serves.kind, id: serves.id }
    chat.setFocus(chat.sessionId, next).catch(() => {})
  }, [followFocus, chat.sessionId, serves?.kind, serves?.id, session?.focus?.kind, session?.focus?.id])

  // Speak each new reply once (when speech back is on in the voice service; speak() is a no-op otherwise).
  const lastReply = useMemo(() => [...chat.messages].reverse().find((m) => m.role === 'assistant') ?? null, [chat.messages])
  const spokenId = useRef<string | null>(null)
  const seeded = useRef(false)
  useEffect(() => {
    if (!lastReply) return
    if (!seeded.current) {
      seeded.current = true // what's already in the thread when it opens isn't read out
      spokenId.current = lastReply.id
      return
    }
    if (lastReply.id === spokenId.current || chat.streaming) return
    spokenId.current = lastReply.id
    if (speakReplies && opts.active) void speak(lastReply.text).catch(() => {})
  }, [lastReply?.id, chat.streaming, speakReplies, opts.active])

  const phase: HudPhase = listening ? 'listening' : chat.streaming && !chat.streamingText ? 'thinking' : chat.streaming ? 'answering' : 'idle'

  return {
    agentId,
    setAgentId,
    chat,
    session,
    focus,
    serves,
    followFocus,
    setFollowFocus,
    voice,
    listening,
    partial,
    lastHeard,
    lastReply,
    speakReplies,
    setSpeakReplies,
    ask,
    phase,
  }
}
