import { MessagesSquare, Users, Landmark, FolderOpen, Wrench } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useHarness } from '../state/harnessStore'
import type { HarnessView } from '../types'

const VIEWS: Array<{ id: HarnessView; label: string; icon: typeof MessagesSquare }> = [
  { id: 'chat', label: 'Chat', icon: MessagesSquare },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'meeting', label: 'Meeting', icon: Landmark },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'tools', label: 'Tools', icon: Wrench },
]

export function HarnessActivityBar() {
  const { state, setActiveView } = useHarness()

  return (
    <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel/40 py-2">
      {VIEWS.map((v) => {
        const Icon = v.icon
        const isActive = state.activeView === v.id
        return (
          <button
            key={v.id}
            type="button"
            title={v.label}
            onClick={() => setActiveView(v.id)}
            className={cn(
              'flex flex-col items-center gap-1 rounded px-1 py-2 text-dim transition-colors hover:text-text',
              isActive && 'bg-panel-2 text-accent',
            )}
          >
            <Icon size={16} />
            <span className="text-[8px] uppercase tracking-wider">{v.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
