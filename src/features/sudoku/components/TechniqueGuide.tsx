import { useState } from 'react'
import { BookOpen, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { TECHNIQUE_INFO, TECHNIQUE_ORDER } from '../techniqueInfo'

const TIER_LABEL: Record<number, string> = { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert' }

export function TechniqueGuide() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="rounded-lg border border-claude-line bg-claude-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen size={16} className="text-claude-clay" />
        <h3 className="font-claude text-base font-medium text-claude-ink">Technique guide</h3>
      </div>
      <div className="space-y-1.5">
        {TECHNIQUE_ORDER.map((id) => {
          const info = TECHNIQUE_INFO[id]
          const expanded = open === id
          return (
            <div key={id} className="rounded-md border border-claude-line">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                <span className="flex-1 text-sm font-medium text-claude-ink">{info.name}</span>
                <span className="rounded-full bg-claude-bg px-2 py-0.5 text-[10px] uppercase tracking-wide text-claude-ink-2">
                  {TIER_LABEL[info.tier]}
                </span>
                <ChevronDown
                  size={15}
                  className={cn('text-claude-ink-2 transition-transform', expanded && 'rotate-180')}
                />
              </button>
              {expanded && (
                <div className="space-y-2 border-t border-claude-line px-3 py-2.5 text-sm leading-relaxed">
                  <p className="text-claude-ink">{info.spot}</p>
                  <p className="rounded-md bg-claude-bg/60 px-2.5 py-1.5 text-xs italic text-claude-ink-2">
                    e.g. {info.example}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
