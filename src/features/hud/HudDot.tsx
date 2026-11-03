import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import type { useHud } from './useHud'

type Hud = ReturnType<typeof useHud>

const OFFSET = { x: 35, y: 12 } // beside the cursor, like Clicky
const FADE_MS = 9000 // the answer fades once it's had time to be read

/** Launcher mode 4: a dot beside the cursor. Hold Ctrl+Alt+B and ask about what's on screen: in the desktop shell
 *  each press takes a screenshot for that question. Partials show while you talk, then the answer, which fades.
 *
 *  In the shell the dot has its own small click-through window that the shell keeps beside the cursor across the
 *  desktop (`fixed`); in a browser tab it follows the cursor inside the page. */
export function HudDot({ hud, fixed = false }: { hud: Hud; fixed?: boolean }) {
  const reduce = useReducedMotion()
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [showReply, setShowReply] = useState(false)

  useEffect(() => {
    if (fixed) return
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX + OFFSET.x, y: e.clientY + OFFSET.y })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [fixed])

  // A new answer shows, then fades; talking again brings the bubble back for the partials. The reply that's
  // already there when the dot appears isn't new.
  const replyId = hud.lastReply?.id
  const seenReply = useRef(replyId)
  useEffect(() => {
    if (!replyId || replyId === seenReply.current) return
    seenReply.current = replyId
    setShowReply(true)
    const t = window.setTimeout(() => setShowReply(false), FADE_MS)
    return () => window.clearTimeout(t)
  }, [replyId])

  const { phase } = hud
  const text = hud.listening ? hud.partial || 'Listening…' : phase === 'thinking' ? 'Looking…' : phase === 'answering' ? hud.chat.streamingText : showReply ? hud.lastReply?.text : null
  const offline = hud.chat.connection === 'unconfigured' || hud.chat.connection === 'error'
  // Near the right edge the bubble goes on the dot's left, so it's never cut off.
  const flip = !fixed && pos.x + 380 > window.innerWidth

  return (
    <div
      className="pointer-events-none fixed z-[96]"
      style={fixed ? { left: 6, top: 6 } : { left: pos.x, top: pos.y, transition: reduce ? undefined : 'left 60ms linear, top 60ms linear' }}
      aria-live="polite"
    >
      <div className={cn('relative flex items-start gap-2', flip && 'flex-row-reverse')} style={flip ? { transform: 'translateX(calc(-100% + 16px))' } : undefined}>
        <div className="relative mt-0.5 h-4 w-4 shrink-0">
          {(phase === 'listening' || phase === 'thinking') && !reduce && (
            <motion.span
              className={cn('absolute inset-0 rounded-full', phase === 'listening' ? 'bg-accent-2/60' : 'bg-accent-4/50')}
              animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
              transition={{ duration: phase === 'listening' ? 0.9 : 1.4, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <span
            className={cn(
              'absolute inset-0 rounded-full border shadow-[0_0_12px_rgba(212,150,173,0.55)]',
              offline ? 'border-line-2 bg-panel-2' : phase === 'idle' ? 'border-accent-4 bg-accent-5' : 'border-accent-1 bg-accent-2',
            )}
          />
        </div>
        <AnimatePresence>
          {text && (
            <motion.div
              key="bubble"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              className="max-h-[30vh] w-[min(340px,70vw)] overflow-hidden rounded-lg border border-line-2 bg-panel/95 px-3 py-2 text-[12.5px] leading-relaxed text-text shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-md"
            >
              {hud.listening && <span className="label mb-0.5 block text-accent-2">listening</span>}
              <span className="line-clamp-[10] whitespace-pre-wrap break-words">{text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
