import type { CSSProperties, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { shade } from '@/lib/color'

/** Elevation level per the design-system workspace model: 1 = structural
 *  (Notes' list, Workbench's roster), 2 = content surface within a panel,
 *  3 = summoned (dock zone, bottom sheets, the agent log), 4 = contained
 *  (Lab's modal-like sub-apps, and Modal itself). Left undefined, Panel
 *  renders with today's flat bg-panel/80 look — elevation is opt-in so
 *  existing call sites are unaffected until a page deliberately adopts it. */
type PanelElevation = 1 | 2 | 3 | 4

const ELEVATION_CLASSES: Record<PanelElevation, string> = {
  1: 'bg-surface-1 border-line rounded-panel',
  2: 'bg-surface-2 border-line rounded-panel',
  3: 'bg-surface-3 border-line-2 rounded-docked shadow-elevation-3 backdrop-blur-sm',
  4: 'bg-surface-4 border-line-2 rounded-docked shadow-elevation-4',
}

interface PanelProps {
  title?: string
  code?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  accent?: string
  /** Overrides the accent-derived border color when a call site needs a
   *  different treatment (e.g. Modal's stronger border alpha). */
  style?: CSSProperties
  /** Real depth (design tokens) instead of the legacy flat opacity look —
   *  opt in per call site as pages migrate to the new system. */
  elevation?: PanelElevation
  /** Adds a close affordance in the header — the same Panel primitive
   *  serves structural, summoned, and contained roles via this flag
   *  rather than forking into separate components. */
  dismissible?: boolean
  onDismiss?: () => void
}

export function Panel({
  title,
  code,
  right,
  children,
  className,
  bodyClassName,
  accent,
  elevation,
  dismissible,
  onDismiss,
  style,
}: PanelProps) {
  // A light and a deep tone derived from the one accent color, instead of
  // a flat fill at different opacities — real tonal depth from whatever
  // hex a call site passes (shared accent, agent color, section color).
  const light = accent ? shade(accent, 0.4) : undefined
  const deep = accent ? shade(accent, -0.4) : undefined

  return (
    <div
      className={cn(
        'relative flex flex-col border',
        elevation ? ELEVATION_CLASSES[elevation] : 'rounded-panel border-line bg-panel/80 backdrop-blur-sm',
        className,
      )}
      style={{
        ...(accent
          ? {
              borderColor: `${accent}33`,
              backgroundImage: `linear-gradient(160deg, ${light}14 0%, transparent 55%)`,
              boxShadow: `inset 0 1px 0 0 ${light}26, 0 12px 28px -20px ${deep}55`,
            }
          : undefined),
        ...style,
      }}
    >
      {(title || right || dismissible) && (
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <div className="flex items-baseline gap-2 min-w-0">
            {code && (
              <span className="text-[10px] tracking-widest text-dim shrink-0">{code}</span>
            )}
            {title && (
              <h2
                className="font-display text-sm uppercase tracking-wider truncate"
                style={{ color: accent ?? '#c8d2dc' }}
              >
                {title}
              </h2>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {right && <div className="text-dim">{right}</div>}
            {dismissible && onDismiss && (
              <button onClick={onDismiss} className="text-dim transition-colors hover:text-text">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className={cn('flex-1 min-h-0 p-3', bodyClassName)}>{children}</div>
    </div>
  )
}
