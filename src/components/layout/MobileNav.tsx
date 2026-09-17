import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MoreHorizontal, X } from 'lucide-react'
import { SECTIONS, type SectionId } from '@/data/sections'
import { clock } from '@/lib/time'
import { useAgentActivitySignal } from '@/features/agentos/useAgentActivitySignal'
import { cn } from '@/lib/cn'

/** Mobile's four reach-for-away-from-desk surfaces (workspace-model
 *  decision) — the rest live under More. Home is deliberately not here:
 *  it's a glance/overview surface, not a jump-to workspace. */
const PRIMARY_IDS: SectionId[] = ['workbench', 'notes', 'calendar', 'projects']

/** Minimal orientation strip (design-system shell) — section name + the
 *  clock. No hamburger: primary navigation lives in the bottom nav now. */
export function MobileTopBar() {
  const [now, setNow] = useState(new Date())
  const location = useLocation()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const section =
    SECTIONS.find((s) => (s.route === '/' ? location.pathname === '/' : location.pathname.startsWith(s.route))) ??
    SECTIONS[0]

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-panel/80 px-3 backdrop-blur lg:hidden">
      <span className="font-display text-base tracking-wider" style={{ color: section.accent }}>
        {section.label}
      </span>
      <span className="tabular-nums text-xs text-dim">{clock(now)}</span>
    </header>
  )
}

/** Persistent bottom nav (mobile shell, Phase 2) — replaces the old
 *  hamburger+drawer. Four primary slots plus a More sheet for the rest,
 *  mirroring the ambient/badge indicator the desktop rail carries. */
export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const { ambient, actionable } = useAgentActivitySignal()

  useEffect(() => setMoreOpen(false), [location.pathname])

  const primary = PRIMARY_IDS.map((id) => SECTIONS.find((s) => s.id === id)!)
  const overflow = SECTIONS.filter((s) => !PRIMARY_IDS.includes(s.id))
  const overflowActive = overflow.some((s) =>
    s.route === '/' ? location.pathname === '/' : location.pathname.startsWith(s.route),
  )

  return (
    <>
      <nav className="flex h-14 shrink-0 items-stretch border-t border-line bg-panel/90 backdrop-blur lg:hidden">
        {primary.map((s) => {
          const Icon = s.icon
          const signal = s.id === 'workbench' ? { ambient, actionable } : { ambient: false, actionable: 0 }
          return (
            <NavLink
              key={s.id}
              to={s.route}
              end={s.route === '/'}
              className={({ isActive }) =>
                cn('flex flex-1 flex-col items-center justify-center gap-1 text-dim transition-colors', isActive && 'text-text')
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon size={18} style={isActive ? { color: s.accent } : undefined} />
                    {signal.ambient && (
                      <span
                        className="absolute -right-1 -top-1 h-1.5 w-1.5 animate-ambient-pulse rounded-full"
                        style={{ backgroundColor: s.accent }}
                      />
                    )}
                    {signal.actionable > 0 && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-danger" />}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider">{s.label.split(' ')[0]}</span>
                </>
              )}
            </NavLink>
          )
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn('flex flex-1 flex-col items-center justify-center gap-1 text-dim transition-colors', overflowActive && 'text-text')}
        >
          <MoreHorizontal size={18} />
          <span className="text-[9px] uppercase tracking-wider">More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[70dvh] flex-col rounded-t-docked border-t border-line-2 bg-panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-display text-sm uppercase tracking-wider text-dim">More</span>
              <button onClick={() => setMoreOpen(false)} className="text-dim hover:text-text" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {overflow.map((s) => {
                const Icon = s.icon
                return (
                  <NavLink
                    key={s.id}
                    to={s.route}
                    end={s.route === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 border-l-2 px-4 py-3 transition-colors',
                        isActive ? 'bg-panel-2 text-text' : 'border-transparent text-dim hover:bg-panel-2/50 hover:text-text',
                      )
                    }
                    style={({ isActive }) => (isActive ? { borderColor: s.accent } : undefined)}
                  >
                    <Icon size={18} style={{ color: s.accent }} />
                    <div className="min-w-0">
                      <div className="text-sm">{s.label}</div>
                      <div className="truncate text-[10px] text-dim">{s.code}</div>
                    </div>
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
