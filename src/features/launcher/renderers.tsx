import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDuration } from './parse'
import { remainingOf, useTimers } from './store'
import type { FormField, LauncherContext, Result } from './types'

// The renderer catalogue: each result kind brings its own small view. Rows
// share one frame (icon, title, hint); the right-hand side and, when stepped
// into, the body below it, belong to the renderer.

export function ResultIcon({ result }: { result: Result }) {
  const Icon = result.icon ?? Sparkles
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line-2 bg-panel-2 text-dim">
      <Icon size={15} strokeWidth={1.75} />
    </span>
  )
}

/** Right-hand preview for a row, by renderer. */
export function ResultAside({ result }: { result: Result }) {
  const p = result.payload
  switch (p.kind) {
    case 'swatch':
      return <span className="h-6 w-10 rounded-md border border-line-2" style={{ background: p.hex }} />
    case 'timer-ring':
      return <TimerRing timerId={p.timerId} durationMs={p.durationMs} />
    case 'reply':
      return <span className="label">AI</span>
    case 'form':
      return <span className="label">Enter to fill</span>
    default:
      return null
  }
}

/** The big line for answers: the value is the result. */
export function AnswerTitle({ value, expression }: { value: string; expression: string }) {
  return (
    <span className="flex min-w-0 items-baseline gap-3">
      <span className="truncate font-mono text-[22px] leading-none text-text">{value}</span>
      <span className="truncate text-[12px] text-dim">{expression}</span>
    </span>
  )
}

function useNow(active: boolean, every = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => setNow(Date.now()), every)
    return () => window.clearInterval(t)
  }, [active, every])
  return now
}

/** Live ring for a running timer, or a full ring previewing a new one. */
export function TimerRing({ timerId, durationMs, size = 30 }: { timerId?: string; durationMs: number; size?: number }) {
  const timer = useTimers().find((t) => t.id === timerId)
  const now = useNow(!!timer && timer.endsAt !== null)
  const remaining = timer ? remainingOf(timer, now) : durationMs
  const total = timer ? timer.durationMs : durationMs
  const frac = total > 0 ? remaining / total : 0
  const r = size / 2 - 3
  const c = 2 * Math.PI * r
  return (
    <span className="flex items-center gap-2">
      <span className="font-mono text-[12px] tabular-nums text-text">{formatDuration(remaining)}</span>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-line-2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className={cn('text-accent transition-[stroke-dashoffset] duration-200 ease-linear', timer?.endsAt === null && 'text-dim')}
        />
      </svg>
    </span>
  )
}

/** Inline fields for commands that need input. No extra window. */
export function FormBody({
  fields,
  submitLabel,
  onSubmit,
  onCancel,
  ctx,
}: {
  fields: FormField[]
  submitLabel: string
  onSubmit: (values: Record<string, string>, ctx: LauncherContext) => void
  onCancel: () => void
  ctx: LauncherContext
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const submit = () => onSubmit(values, ctx)
  return (
    <div
      className="flex flex-col gap-2 px-3 pb-3 pt-1"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          onCancel()
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          submit()
        }
      }}
    >
      {fields.map((f, i) => {
        const common = {
          autoFocus: i === 0,
          value: values[f.id] ?? '',
          placeholder: f.placeholder,
          'aria-label': f.label,
          onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [f.id]: e.target.value })),
          className:
            'w-full rounded-md border border-line-2 bg-bg px-3 py-2 text-[13px] text-text outline-none placeholder:text-dim focus:border-accent-4',
        }
        return f.multiline ? <textarea key={f.id} rows={3} {...common} /> : <input key={f.id} {...common} />
      })}
      <div className="flex items-center justify-end gap-2 text-[12px]">
        <span className="mr-auto text-dim">Ctrl+Enter to save · Esc to go back</span>
        <button type="button" onClick={onCancel} className="rounded-md px-2 py-1 text-dim hover:text-text">
          Cancel
        </button>
        <button type="button" onClick={submit} className="rounded-md border border-accent-4 bg-accent-5/30 px-3 py-1 text-accent-1 hover:bg-accent-5/50">
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

/** AI mode, before it is wired to Agent-OS: says plainly what will happen. */
export function ReplyBody({ query }: { query: string }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 text-[13px]">
      <div className="self-end rounded-lg border border-line-2 bg-panel-2 px-3 py-2 text-text">{query}</div>
      <div className="flex items-start gap-2 text-dim">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-accent" />
        <p>
          AI mode isn&apos;t connected yet. Once it is, this goes to the launcher agent as a Workbench thread, focused on the goal or
          project the active window maps to, and the reply streams in here.
        </p>
      </div>
    </div>
  )
}
