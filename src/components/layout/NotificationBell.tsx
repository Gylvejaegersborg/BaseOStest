import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff } from 'lucide-react'
import { Glow } from '@/components/ui/Glow'
import { useCalendar } from '@/features/calendar/CalendarContext'
import { useNeedsYou } from '@/features/agentos/useNeedsYou'
import type { AgentOsNeedsYou } from '@/features/agentos/client'
import { RemindersPanel } from '@/features/calendar/RemindersPanel'
import { cn } from '@/lib/cn'

const GLOW = '#9b7bff'
const SOON_MS = 10 * 60_000

/** What needs the operator now: pending approvals first, then the open todos the agents made, grouped by the flow they came from.
 *  Each line goes to where it can be dealt with (the approval, or the flow's results). */
function NeedsYouSection({ needs, onGo }: { needs: AgentOsNeedsYou; onGo: (to: string) => void }) {
  const groups = new Map<string, { title: string; flowId?: string; items: AgentOsNeedsYou['todos'] }>()
  for (const t of needs.todos) {
    const key = t.flowId ?? 'other'
    const g = groups.get(key) ?? { title: t.flowTitle ?? 'Other', flowId: t.flowId, items: [] }
    g.items.push(t)
    groups.set(key, g)
  }
  return (
    <div className="mb-2 border border-accent/40 bg-panel shadow-glow">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="label">Needs you now</span>
        <span className="text-[10px] text-dim">{needs.total === 0 ? 'nothing waiting' : `${needs.total} waiting`}</span>
      </div>
      {needs.total === 0 ? (
        <p className="px-3 py-2 text-[11px] text-dim">Nothing is waiting on you. Approvals and the decisions agents leave for you show up here.</p>
      ) : (
        <div className="max-h-[50dvh] divide-y divide-line/60 overflow-y-auto">
          {needs.approvals.length > 0 && (
            <div className="px-3 py-2">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-dim">Approvals ({needs.approvals.length})</p>
              {needs.approvals.map((a) => (
                <button key={a.id} onClick={() => onGo(`/workbench?panel=approvals&approval=${encodeURIComponent(a.id)}`)} className="block w-full py-1 text-left text-xs hover:text-accent">
                  <span className="capitalize">{a.agentId}</span> <span className="text-dim">wants to run</span> <code>{a.toolName}</code>
                  <span className="block truncate text-[10px] text-dim">{a.summary}</span>
                </button>
              ))}
            </div>
          )}
          {[...groups.values()].map((g) => (
            <div key={g.flowId ?? 'other'} className="px-3 py-2">
              <button onClick={() => onGo(g.flowId ? `/workbench?panel=flow&flow=${encodeURIComponent(g.flowId)}` : '/workbench?panel=flow')} className="mb-1 flex w-full items-center justify-between text-left text-[10px] uppercase tracking-wider text-dim hover:text-accent">
                <span className="truncate">{g.title}</span>
                <span className="shrink-0">{g.items.length} to do →</span>
              </button>
              {g.items.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onGo(t.flowId ? `/workbench?panel=flow&flow=${encodeURIComponent(t.flowId)}` : '/workbench?panel=flow')}
                  className="block w-full truncate py-0.5 text-left text-xs text-text/90 hover:text-accent"
                  title={t.title}
                >
                  {t.priority === 'high' && <span className="mr-1 text-danger">●</span>}
                  {t.title}
                </button>
              ))}
              {g.items.length > 5 && <p className="text-[10px] text-dim">+{g.items.length - 5} more in the flow</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The notifications bell next to the clock (desktop top bar and phone top
 * strip). Glows like the nav rail when a notification has fired since you
 * last opened it, or something pings within the next ten minutes; opens the
 * notifications panel (upcoming pings, quick "remind me", mute, push setup).
 */
export function NotificationBell({ className }: { className?: string }) {
  const { remindersEngine: engine, saveTask } = useCalendar()
  const needs = useNeedsYou()
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
  const glow = (engine.enabled && (unseen > 0 || soon)) || needs.total > 0

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
        title={needs.total > 0 ? `${needs.total} waiting on you` : engine.enabled ? (unseen ? `${unseen} new notification${unseen > 1 ? 's' : ''}` : 'Notifications') : 'Notifications (muted)'}
        className={cn('relative rounded-control p-1 transition-colors', open ? 'text-accent' : 'text-dim hover:text-text', className)}
      >
        {glow && <Glow color={GLOW} className="rounded-full" />}
        {engine.enabled ? <Bell size={14} /> : <BellOff size={14} />}
        {needs.total > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold leading-none text-bg">
            {needs.total > 99 ? '99+' : needs.total}
          </span>
        )}
      </button>
      {open &&
        rect &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="fixed z-50 max-h-[75dvh] animate-fade-in overflow-y-auto bg-bg shadow-glow"
              style={{ top: rect.bottom + 6, left, width }}
            >
              <NeedsYouSection
                needs={needs}
                onGo={(to) => {
                  setOpen(false)
                  navigate(to)
                }}
              />
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
