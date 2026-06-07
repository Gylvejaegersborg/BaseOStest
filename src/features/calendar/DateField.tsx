import { format } from 'date-fns'
import { cn } from '@/lib/cn'
import { dayOffsetOf, offsetDate } from './util'

interface DateFieldProps {
  /** Day offset relative to today (0 = today). undefined = no date set. */
  value: number | undefined
  onChange: (dayOffset: number | undefined) => void
  allowEmpty?: boolean
  className?: string
}

/**
 * Shared day picker used across every editor and quick-add. Shows actual
 * calendar dates (native date input) while the rest of the app keeps working
 * in day-offset units.
 */
export function DateField({ value, onChange, allowEmpty = false, className }: DateFieldProps) {
  const dateStr = value != null ? format(offsetDate(value), 'yyyy-MM-dd') : ''
  return (
    <input
      type="date"
      value={dateStr}
      onChange={(e) => {
        const v = e.target.value
        if (!v) {
          if (allowEmpty) onChange(undefined)
          return
        }
        const [y, m, d] = v.split('-').map(Number)
        onChange(dayOffsetOf(new Date(y, m - 1, d)))
      }}
      className={cn(
        'border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none [color-scheme:dark]',
        className,
      )}
    />
  )
}
