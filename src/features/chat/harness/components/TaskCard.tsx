import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import type { Task, TaskStatus } from '../protocol'

const STATUS_COLOR: Record<TaskStatus, string> = {
  queued: '#6b7785',
  running: '#46d369',
  succeeded: '#36e0c8',
  failed: '#ff5566',
  timed_out: '#ff5566',
  cancelled: '#6b7785',
  lost: '#ff5566',
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  queued: 'QUEUED',
  running: 'WORKING',
  succeeded: 'DONE',
  failed: 'FAILED',
  timed_out: 'TIMED OUT',
  cancelled: 'CANCELLED',
  lost: 'LOST',
}

export function TaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
  const label = (task.input as { goal?: string })?.goal ?? task.type
  return (
    <div className={cn('rounded border border-line bg-panel-2 px-2.5 py-2', compact ? 'text-[10px]' : 'text-xs')}>
      <div className="flex items-center gap-1.5">
        <StatusDot color={STATUS_COLOR[task.status]} pulse={task.status === 'running'} size={6} />
        <span className="truncate text-text">{String(label)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-dim">
        <span>{task.agentId}</span>
        <span>{STATUS_LABEL[task.status]}</span>
      </div>
    </div>
  )
}
