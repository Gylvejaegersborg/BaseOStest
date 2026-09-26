import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff } from 'lucide-react'
import { Glow } from '@/components/ui/Glow'
import { useCalendar } from '@/features/calendar/CalendarContext'
import { RemindersPanel } from '@/features/calendar/RemindersPanel'
import { cn } from '@/lib/cn'

const GLOW = '#9b7bff'
const SOON_MS = 10 * 60_000

/**
 * The notifications bell next to the clock (desktop top bar and phone top
 * strip). Glows like the nav rail when a notification has fired since you
 * last opened it, or something pings within the next ten minutes; opens the
 * notifications panel (upcoming pings, quick "remind me", mute, push setup).
 */
export function NotificationBell({ className }: { className?: string }) {
  const { remindersEngine: engine, saveTask } = useCalendar()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  const [now, setNow] = useState(() => Date.now())
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const unseen = engine.nudges.filter((n) => !seen.has(n.id)).length
  const soon = engine.scheduled.some((s) => s.fireAt >= now && s.fireAt - now <= SOON_MS)
  const glow = engine.enabled && (unseen > 0 || soon)

  const toggle = () => {
    setOpen((o) => !o)
    setSeen(new Set(engine.nudges.map((n) => n.id)))
  }

  const rect = btn.current?.getBoundingClientRect()
  // Anchor under the bell but keep the panel fully on screen.
  const width = Math.min(340, window.innerWidth - 16)
  const left = rect ? Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8) : 8

  return (
    <>
      <button
        ref={btn}
        onClick={toggle}
        title={engine.enabled ? (unseen ? `${unseen} new notification${unseen > 1 ? 's' : ''}` : 'Notifications') : 'Notifications (muted)'}
        className={cn('relative rounded-control p-1 transition-colors', open ? 'text-accent' : 'text-dim hover:text-text', className)}
      >
        {glow && <Glow color={GLOW} className="rounded-full" />}
        {engine.enabled ? <Bell size={14} /> : <BellOff size={14} />}
      </button>
      {open &&
        rect &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="fixed z-50 max-h-[75dvh] animate-fade-in overflow-y-auto shadow-glow"
              style={{ top: rect.bottom + 6, left, width }}
            >
              <RemindersPanel
                enabled={engine.enabled}
                permission={engine.permission}
                scheduled={engine.scheduled}
                limit={8}
                onToggle={engine.toggleEnabled}
                onEnableNotifications={engine.enableNotifications}
                onTest={engine.testNudge}
                onAddReminder={(title, dayOffset, time) =>
                  saveTask({
                    id: `t-${Date.now()}`,
                    title,
                    status: 'todo',
                    priority: 'low',
                    dayOffset,
                    dueTime: time,
                    notify: true,
                    reminderMinutes: 0,
                    source: 'manual',
                  })
                }
                onSelect={() => {
                  setOpen(false)
                  navigate('/calendar')
                }}
              />
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
