import { AlarmClock, Bell, Check, Clock, X } from 'lucide-react'
import type { Nudge } from './useReminders'

interface NudgeStackProps {
  nudges: Nudge[]
  onDismiss: (id: string) => void
  onSnooze: (nudge: Nudge) => void
  onComplete: (nudge: Nudge) => void
}

export function NudgeStack({ nudges, onDismiss, onSnooze, onComplete }: NudgeStackProps) {
  if (!nudges.length) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2">
      {nudges.map((n) => (
        <NudgeCard
          key={n.id}
          nudge={n}
          onDismiss={() => onDismiss(n.id)}
          onSnooze={() => onSnooze(n)}
          onComplete={() => onComplete(n)}
        />
      ))}
    </div>
  )
}

function NudgeCard({
  nudge,
  onDismiss,
  onSnooze,
  onComplete,
}: {
  nudge: Nudge
  onDismiss: () => void
  onSnooze: () => void
  onComplete: () => void
}) {
  const Icon = nudge.stage === 'now' ? Bell : nudge.stage === 'manual' ? AlarmClock : Clock
  return (
    <div
      className="pointer-events-auto animate-fade-in border border-line-2 bg-panel/95 shadow-glow backdrop-blur-sm"
      style={{ borderLeftColor: nudge.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <Icon size={15} style={{ color: nudge.color }} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest" style={{ color: nudge.color }}>
              {nudge.stage === 'now' ? 'Starting now' : nudge.stage === 'manual' ? 'Reminder' : 'Heads up'}
            </span>
          </div>
          <div className="truncate text-sm text-text">{nudge.title}</div>
          <div className="mt-0.5 text-[11px] text-dim">{nudge.body}</div>
          <div className="mt-2 flex items-center gap-2">
            {nudge.source === 'task' && (
              <button
                onClick={onComplete}
                className="flex items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-neon-green hover:bg-panel-2/60"
              >
                <Check size={11} /> Done
              </button>
            )}
            <button
              onClick={onSnooze}
              className="flex items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim hover:text-text"
            >
              <AlarmClock size={11} /> Snooze 10m
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="shrink-0 text-dim transition-colors hover:text-text">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
