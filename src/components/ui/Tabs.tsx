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
}

/**
 * The unified tab-bar primitive (design-system workspace model) — one
 * implementation of the icon-plus-label activity-bar pattern currently
 * duplicated across Team, WorkbenchTopStrip, and Lab's module switcher.
 * Arrow-key navigation moves focus between tabs; Enter/Space activates,
 * matching standard tablist keyboard behavior.
 */
export function Tabs<T extends string>({ tabs, active, onChange, className, labelClassName, glow }: TabsProps<T>) {
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
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el
          }}
          role="tab"
          aria-selected={active === t.id}
          tabIndex={active === t.id ? 0 : -1}
          onKeyDown={(e) => onKeyDown(e, i)}
          onClick={() => onChange(t.id)}
          title={t.label}
          className={cn(
            'relative flex items-center gap-1.5 rounded-control border px-2 py-1.5 text-[11px] uppercase tracking-wider transition-colors',
            active === t.id
              ? 'border-accent-3/40 bg-gradient-to-br from-accent-1/20 to-accent-4/10 text-accent-4'
              : 'border-transparent text-dim hover:border-line hover:text-text',
          )}
        >
          {glow?.[t.id] && <Glow color={glow[t.id]!} />}
          {t.icon && <t.icon size={13} />}
          <span className={cn('hidden lg:inline', labelClassName)}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}
