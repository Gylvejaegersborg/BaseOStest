import { Search } from 'lucide-react'
import { cn } from '@/lib/cn'

export function SearchInput({
  value,
  onChange,
  placeholder = 'search…',
  className,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search size={14} className="absolute left-2.5 text-dim" />
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-line bg-bg/60 py-2 pl-8 pr-3 text-sm text-text placeholder:text-dim focus:border-accent/60 focus:outline-none"
      />
    </div>
  )
}
