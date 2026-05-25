import { cn } from '@/lib/cn'

export function StatusDot({
  color = '#46d369',
  pulse = false,
  size = 8,
  className,
}: {
  color?: string
  pulse?: boolean
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn('inline-block rounded-full', pulse && 'animate-pulse-dot', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  )
}
