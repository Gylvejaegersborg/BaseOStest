import { NavLink } from 'react-router-dom'
import { SECTIONS } from '@/data/sections'
import { cn } from '@/lib/cn'

export function NavBar() {
  return (
    <nav className="flex h-full w-[68px] flex-col items-stretch border-r border-line bg-panel/60 py-3">
      <div className="mb-3 flex flex-col items-center">
        <div className="font-display text-lg leading-none text-accent">OS</div>
        <div className="text-[8px] tracking-[0.3em] text-dim">v0.1</div>
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          return (
            <NavLink
              key={s.id}
              to={s.route}
              end={s.route === '/'}
              title={s.label}
              className={({ isActive }) =>
                cn(
                  'group relative flex flex-col items-center gap-1 py-2.5 text-dim transition-colors hover:text-text',
                  isActive && 'text-text',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 transition-all',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                    style={{ backgroundColor: s.accent, boxShadow: `0 0 8px ${s.accent}` }}
                  />
                  <Icon size={18} style={isActive ? { color: s.accent } : undefined} />
                  <span className="text-[8px] uppercase tracking-wider">{s.label.split(' ')[0]}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
