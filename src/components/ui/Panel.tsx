import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PanelProps {
  title?: string
  code?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  accent?: string
}

export function Panel({ title, code, right, children, className, bodyClassName, accent }: PanelProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col border border-line bg-panel/80 backdrop-blur-sm',
        className,
      )}
      style={accent ? { borderColor: `${accent}33` } : undefined}
    >
      {(title || right) && (
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
          {right && <div className="shrink-0 text-dim">{right}</div>}
        </div>
      )}
      <div className={cn('flex-1 min-h-0 p-3', bodyClassName)}>{children}</div>
    </div>
  )
}
