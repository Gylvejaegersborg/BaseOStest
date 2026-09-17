import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { SECTIONS, type SectionId } from '@/data/sections'
import { useAgentActivitySignal } from '@/features/agentos/useAgentActivitySignal'
import { useSectionShortcuts } from './useSectionShortcuts'
import { cn } from '@/lib/cn'

const KEYBOARD_PIN_MS = 1500

/**
 * The persistent nav rail (desktop shell, Phase 2). Collapses to a
 * minimal always-visible sliver — one thin accent-colored mark per
 * section, so relative position/color is still glanceable — and expands
 * to the full icon+label rail on hover-proximity or a Shift+[number]
 * jump. Nothing is ever fully hidden, so switching sections never means
 * hunting for a trigger zone; the sliver's tick marks always tell you
 * where things are before you commit to opening it.
 */
export function NavBar({ className }: { className?: string }) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const pinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const location = useLocation()
  const { ambient, actionable } = useAgentActivitySignal()

  const expanded = hovered || pinned

  const onJump = () => {
    setPinned(true)
    if (pinTimer.current) clearTimeout(pinTimer.current)
    pinTimer.current = setTimeout(() => setPinned(false), KEYBOARD_PIN_MS)
  }
  useSectionShortcuts(onJump)

  useEffect(() => () => {
    if (pinTimer.current) clearTimeout(pinTimer.current)
  }, [])

  const signalFor = (id: SectionId) =>
    id === 'workbench' ? { ambient, actionable } : { ambient: false, actionable: 0 }

  return (
    <div
      className={cn('relative h-full shrink-0', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Always-visible sliver — reserves layout space so expanding never reflows content. */}
      <div className="flex h-full w-2 flex-col items-center gap-0.5 border-r border-line bg-panel/60 py-3">
        {SECTIONS.map((s) => {
          const isActive = s.route === '/' ? location.pathname === '/' : location.pathname.startsWith(s.route)
          const { ambient: sectionAmbient, actionable: sectionActionable } = signalFor(s.id)
          return (
            <NavLink
              key={s.id}
              to={s.route}
              end={s.route === '/'}
              aria-label={s.label}
              className="flex w-full flex-1 items-center justify-center"
            >
              <span
                className={cn(
                  'block w-0.5 rounded-full transition-all',
                  isActive ? 'h-3.5 opacity-100' : 'h-2 opacity-40',
                  sectionAmbient && 'animate-ambient-pulse',
                )}
                style={{ backgroundColor: s.accent }}
              />
              {sectionActionable > 0 && (
                <span className="absolute left-1.5 h-1 w-1 rounded-full bg-danger" style={{ marginTop: '-10px' }} />
              )}
            </NavLink>
          )
        })}
      </div>

      {/* Expanded overlay — floats above content, doesn't push layout. */}
      <nav
        className={cn(
          'absolute left-0 top-0 z-40 flex h-full w-[68px] flex-col items-stretch border-r border-line bg-panel/95 py-3 shadow-elevation-3 backdrop-blur-sm transition-transform duration-fast ease-standard',
          expanded ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-3 flex shrink-0 flex-col items-center">
          <div className="font-display text-lg leading-none text-accent">OS</div>
          <div className="text-[8px] tracking-[0.3em] text-dim">v0.1</div>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            const { ambient: sectionAmbient, actionable: sectionActionable } = signalFor(s.id)
            return (
              <NavLink
                key={s.id}
                to={s.route}
                end={s.route === '/'}
                title={s.label}
                className={({ isActive }) =>
                  cn(
                    'group relative flex shrink-0 flex-col items-center gap-1 py-2.5 text-dim transition-colors hover:text-text',
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
                    <span className="relative">
                      <Icon size={18} style={isActive ? { color: s.accent } : undefined} />
                      {sectionAmbient && (
                        <span
                          className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full animate-ambient-pulse"
                          style={{ backgroundColor: s.accent }}
                        />
                      )}
                      {sectionActionable > 0 && (
                        <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-danger" />
                      )}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider">{s.label.split(' ')[0]}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
