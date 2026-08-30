import { useHarness } from '../state/harnessStore'
import { TaskCard } from './TaskCard'

export function TaskRail() {
  const { state } = useHarness()
  const activeTasks = state.tasks.filter((t) => t.status === 'running' || t.status === 'queued')
  const doneTasks = state.tasks.filter((t) => t.status !== 'running' && t.status !== 'queued')

  return (
    <div className="space-y-2 p-3">
      <div className="text-[10px] uppercase tracking-wider text-dim">
        Tasks {activeTasks.length > 0 && <span className="text-text">· {activeTasks.length} active</span>}
      </div>
      <div className="space-y-1.5">
        {[...activeTasks, ...doneTasks].map((task) => (
          <TaskCard key={task.id} task={task} compact />
        ))}
        {state.tasks.length === 0 && <div className="text-[10px] text-dim">No tasks yet.</div>}
      </div>
    </div>
  )
}
