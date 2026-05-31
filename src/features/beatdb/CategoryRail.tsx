import { CATEGORIES, ALL_ICON } from './categories'
import type { AssetCategory } from '@/data/library'
import { cn } from '@/lib/cn'

interface CategoryRailProps {
  active: AssetCategory | 'all'
  counts: Record<string, number>
  total: number
  onSelect: (id: AssetCategory | 'all') => void
}

/** Vertical, icon + label category list. The DB's left-most spine. */
export function CategoryRail({ active, counts, total, onSelect }: CategoryRailProps) {
  return (
    <nav className="hidden w-[184px] shrink-0 flex-col overflow-y-auto border-r border-line bg-panel/40 py-2 lg:flex">
      <div className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-[0.18em] text-dim">Categories</div>
      <RailButton
        icon={ALL_ICON}
        label="All Assets"
        accent="#c8d2dc"
        count={total}
        active={active === 'all'}
        onClick={() => onSelect('all')}
      />
      <div className="my-1 mx-3 border-t border-line" />
      {CATEGORIES.map((c) => {
        const Icon = c.icon
        return (
          <RailButton
            key={c.id}
            icon={Icon}
            label={c.label}
            accent={c.accent}
            count={counts[c.id] ?? 0}
            active={active === c.id}
            onClick={() => onSelect(c.id)}
          />
        )
      })}
    </nav>
  )
}

function RailButton({
  icon: Icon,
  label,
  accent,
  count,
  active,
  onClick,
}: {
  icon: typeof ALL_ICON
  label: string
  accent: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-2.5 border-l-2 px-3 py-2 text-left transition-colors',
        active ? 'bg-panel-2/60 text-text' : 'border-transparent text-dim hover:bg-panel-2/40 hover:text-text',
      )}
      style={active ? { borderColor: accent } : undefined}
    >
      <Icon size={15} style={{ color: active ? accent : undefined }} className="shrink-0" />
      <span className="flex-1 truncate text-xs">{label}</span>
      <span
        className="shrink-0 text-[10px] tabular-nums"
        style={active ? { color: accent } : undefined}
      >
        {count}
      </span>
    </button>
  )
}
