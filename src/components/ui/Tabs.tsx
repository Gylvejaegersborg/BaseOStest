import { useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Glow } from './Glow'

export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: LucideIcon
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[]
  active: T | null
  onChange: (id: T) => void
  className?: string
  /** Hide labels below this breakpoint's own responsive class, matching
   *  the icon-plus-label pattern Workbench's activity bar already uses. */
  labelClassName?: string
  /** Tabs to flag with a pulsing glow (e.g. pending approvals), by colour. */
  glow?: Partial<Record<T, string>>
  /** A count on a tab (e.g. approvals waiting). */
  badge?: Partial<Record<T, number>>
  /** A thin divider after these tabs: they end a group. */
  dividerAfter?: T[]
  /** Tabs that have nothing to show right now: dimmed, with this as the hint. */
  dim?: Partial<Record<T, string>>
}

/**
 * The unified tab-bar primitive (design-system workspace model) — one
 * implementation of the icon-plus-label activity-bar pattern currently
 * duplicated across Team, WorkbenchTopStrip, and Lab's module switcher.
 * Arrow-key navigation moves focus between tabs; Enter/Space activates,
 * matching standard tablist keyboard behavior.
 */
export function Tabs<T extends string>({ tabs, active, onChange, className, labelClassName, glow, badge, dividerAfter, dim }: TabsProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = e.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length
    const nextId = tabs[next].id
    refs.current[nextId]?.focus()
    onChange(nextId)
  }

  return (
    <div role="tablist" className={cn('flex shrink-0 items-center gap-1', className)}>
      {tabs.map((t, i) => (
        <span key={t.id} className="flex items-center gap-1">
        <button
          ref={(el) => {
            refs.current[t.id] = el
          }}
          role="tab"
          aria-selected={active === t.id}
          tabIndex={active === t.id ? 0 : -1}
          onKeyDown={(e) => onKeyDown(e, i)}
          onClick={() => onChange(t.id)}
          title={dim?.[t.id] ?? t.label}
          className={cn(
            'relative flex items-center gap-1.5 rounded-control border px-2 py-1.5 text-[11px] uppercase tracking-wider transition-colors',
            active === t.id
              ? 'border-accent-3/40 bg-gradient-to-br from-accent-1/20 to-accent-4/10 text-accent-4'
              : 'border-transparent text-dim hover:border-line hover:text-text',
            dim?.[t.id] && active !== t.id && 'opacity-40',
          )}
        >
          {glow?.[t.id] && <Glow color={glow[t.id]!} />}
          {t.icon && <t.icon size={13} />}
          <span className={cn('hidden lg:inline', labelClassName)}>{t.label}</span>
          {(badge?.[t.id] ?? 0) > 0 && (
            <span className="min-w-4 rounded-full bg-accent px-1 text-center text-[9px] font-semibold leading-4 text-bg">{badge![t.id]}</span>
          )}
        </button>
        {dividerAfter?.includes(t.id) && <span className="mx-1 h-4 w-px bg-line" />}
        </span>
      ))}
    </div>
  )
}
