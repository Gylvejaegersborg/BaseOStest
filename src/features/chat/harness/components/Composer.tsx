import { useState, type KeyboardEvent } from 'react'
import { Send, Paperclip } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useHarness } from '../state/harnessStore'

/** Phase 5: local-only fake dispatch — appending straight to state.
 *  Phase 6 replaces this with a real send.message command over
 *  useHarnessSocket(); the Composer UI itself doesn't change. */
export function Composer() {
  const { state, addMessage } = useHarness()
  const [value, setValue] = useState('')

  function handleSend() {
    const text = value.trim()
    if (!text) return

    // Slash-command parsing happens BEFORE normal message dispatch, per
    // plan §47 — real command execution (model/agent/task/terminal/hud)
    // lands with the commands/ registry in a later phase; for now an
    // unrecognized-but-intercepted command is surfaced as a system event
    // rather than silently sent to the (fake, for now) agent.
    if (text.startsWith('/')) {
      addMessage({
        id: `sys_${Date.now()}`,
        kind: 'system-event',
        timestamp: new Date().toISOString(),
        sessionId: state.activeSessionId ?? 'sess_fake',
        text: `Command "${text}" recognized but not yet wired (commands registry lands in a later phase).`,
      })
      setValue('')
      return
    }

    addMessage({
      id: `msg_${Date.now()}`,
      kind: 'user-message',
      timestamp: new Date().toISOString(),
      sessionId: state.activeSessionId ?? 'sess_fake',
      text,
    })
    setValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-line bg-panel/60 p-3">
      <button
        type="button"
        title="Attach a file (not wired yet)"
        disabled
        className="mb-1 shrink-0 rounded p-1.5 text-dim opacity-40"
      >
        <Paperclip size={16} />
      </button>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Ask the agent... (/ for commands)"
        className="max-h-32 min-h-[2.25rem] flex-1 resize-none rounded border border-line-2 bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!value.trim()}
        className={cn(
          'mb-1 shrink-0 rounded p-2 transition-colors',
          value.trim() ? 'bg-accent text-bg hover:opacity-90' : 'bg-panel-2 text-dim',
        )}
      >
        <Send size={15} />
      </button>
    </div>
  )
}
