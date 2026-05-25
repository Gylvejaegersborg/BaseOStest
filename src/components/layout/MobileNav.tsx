import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { SECTIONS } from '@/data/sections'
import { clock } from '@/lib/time'
import { cn } from '@/lib/cn'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(new Date())
  const location = useLocation()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // close the drawer whenever the route changes
  useEffect(() => setOpen(false), [location.pathname])

  const section =
    SECTIONS.find((s) => (s.route === '/' ? location.pathname === '/' : location.pathname.startsWith(s.route))) ??
    SECTIONS[0]

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-panel/80 px-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-dim hover:text-text"
          aria-label="Open menu"
        >
          <Menu size={20} />
          <span className="font-display text-base tracking-wider" style={{ color: section.accent }}>
            {section.label}
          </span>
        </button>
        <span className="tabular-nums text-xs text-dim">{clock(now)}</span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col border-r border-line-2 bg-panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <div className="font-display text-lg leading-none text-accent">PERSONAL OS</div>
                <div className="text-[9px] tracking-[0.3em] text-dim">v0.1 · MOCK DATA</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-dim hover:text-text" aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {SECTIONS.map((s) => {
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
          </nav>
        </div>
      )}
    </>
  )
}
