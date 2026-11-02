import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Loader2, Mic, Send, Target, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAgentOsAgents } from '@/features/agentos/useAgentOsAgents'
import type { useHud } from './useHud'

type Hud = ReturnType<typeof useHud>

/** Launcher mode 5: a conversation with the agents. One composer line, the last reply under it (capped in
 *  height, like Hermes' HUD), and what the session serves. Ctrl+Alt+B talks; partials show while you hold. */
export function HudChat({ hud, onClose }: { hud: Hud; onClose: () => void }) {
  const navigate = useNavigate()
  const { agents } = useAgentOsAgents()
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { chat } = hud

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const send = () => {
    const text = draft.trim()
    if (!text || chat.connection !== 'ready') return
    setDraft('')
    void hud.ask(text)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      send()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (chat.streaming) void chat.cancel()
      else onClose()
    }
  }

  const lastUser = [...chat.messages].reverse().find((m) => m.role === 'user')
  const reply = chat.streaming ? chat.streamingText : hud.lastReply?.text
  const agentName = agents.find((a) => a.id === hud.agentId)?.name ?? hud.agentId
  const offline = chat.connection === 'unconfigured' || chat.connection === 'error'

  return (
    <div className="flex flex-col">
      <div className="flex h-14 items-center gap-3 border-b border-line px-4 text-text">
        {hud.listening ? (
          <Mic size={18} className="animate-pulse text-accent" aria-label="Listening" />
        ) : chat.streaming ? (
          <Loader2 size={18} className="animate-spin text-dim" aria-label="Working" />
        ) : (
          <Mic size={18} className={hud.voice === 'on' ? 'text-dim' : 'text-dim/40'} aria-label={hud.voice === 'on' ? 'Voice ready' : 'Voice service not running'} />
        )}
        <input
          ref={inputRef}
          value={hud.listening ? hud.partial : draft}
          readOnly={hud.listening}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={hud.listening ? 'Listening… (English shows as you speak)' : `Ask ${agentName} — or hold Ctrl+Alt+B and talk`}
          aria-label="Message the agent"
          spellCheck={false}
          className={cn('h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-dim', hud.listening && 'text-accent-2')}
        />
        <select
          value={hud.agentId}
          onChange={(e) => hud.setAgentId(e.target.value)}
          aria-label="Agent"
          className="rounded-md border border-line-2 bg-panel-2 px-2 py-1 text-[12px] text-text"
        >
          {(agents.length ? agents : [{ id: hud.agentId, name: hud.agentId }]).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={send} disabled={!draft.trim() || chat.connection !== 'ready'} aria-label="Send" className="text-dim hover:text-text disabled:opacity-30">
          <Send size={16} />
        </button>
      </div>

      <div className="max-h-[38vh] min-h-[72px] overflow-y-auto px-4 py-3 text-[13px]">
        {offline ? (
          <p className="text-dim">
            {chat.connection === 'unconfigured' ? 'Agent-OS isn’t configured for this BaseSpace (VITE_AGENT_OS_GATEWAY_URL).' : `Can’t reach Agent-OS: ${chat.errorText}`}
          </p>
        ) : chat.connection !== 'ready' ? (
          <p className="text-dim">Connecting to {agentName}…</p>
        ) : (
          <>
            {lastUser && <div className="mb-2 truncate text-[12px] text-dim">You: {lastUser.text}</div>}
            {reply ? (
              <p className="whitespace-pre-wrap break-words leading-relaxed text-text">{reply}</p>
            ) : chat.streaming ? (
              <p className="text-dim">{chat.workingOn ? `${agentName} is using ${chat.workingOn}…` : `${agentName} is thinking…`}</p>
            ) : (
              <p className="text-dim">The {agentName} HUD thread. It knows the window you’re in{hud.serves ? ' and what it serves' : ''}.</p>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-1.5 text-[11px] text-dim">
        {hud.serves ? (
          <button
            type="button"
            onClick={() => hud.setFollowFocus(!hud.followFocus)}
            title={hud.followFocus ? 'The thread follows the window in front. Click to stop.' : 'Click to let the thread follow the window in front.'}
            className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5', hud.followFocus ? 'border-accent-5 text-accent-2' : 'border-line-2 line-through')}
          >
            <Target size={11} /> Serves: {hud.serves.title}
          </button>
        ) : hud.focus ? (
          <span className="truncate" title={hud.focus.title}>
            In {hud.focus.app.replace(/\.exe$/i, '')}
          </span>
        ) : null}
        <button type="button" onClick={() => hud.setSpeakReplies(!hud.speakReplies)} className="flex items-center gap-1 hover:text-text" title="Read replies aloud (needs speech back on in the voice service)">
          {hud.speakReplies ? <Volume2 size={12} /> : <VolumeX size={12} />} {hud.speakReplies ? 'Speaking replies' : 'Silent'}
        </button>
        {chat.sessionId && (
          <button
            type="button"
            onClick={() => {
              navigate(`/workbench?agent=${encodeURIComponent(hud.agentId)}&session=${encodeURIComponent(chat.sessionId!)}`)
              onClose()
            }}
            className="ml-auto flex items-center gap-1 hover:text-text"
          >
            <ExternalLink size={11} /> Open in Workbench
          </button>
        )}
      </div>
    </div>
  )
}
