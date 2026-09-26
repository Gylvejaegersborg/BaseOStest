import { shade } from '@/lib/color'
import { cn } from '@/lib/cn'

/** The soft pulsing wash the nav rail uses for "something's happening
 *  here" — drop it inside any `relative` button to flag it (pending
 *  approvals, a fired notification). Purely decorative. */
export function Glow({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 animate-glow-pulse rounded-[inherit]', className)}
      style={{
        background: `radial-gradient(circle at 50% 50%, ${color}40, ${shade(color, -0.3)}1a 65%, transparent 90%)`,
        boxShadow: `0 0 12px ${color}88, inset 0 0 0 1px ${color}aa`,
      }}
    />
  )
}
