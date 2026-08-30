import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/cn'
import type { ConversationItem } from '../protocol'
import type { AgentRuntime } from '../types'
import { ToolCall, ToolResult } from './ToolCall'
import { PermissionCard } from './PermissionCard'
import { TaskCard } from './TaskCard'

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Message({ item, agent }: { item: ConversationItem; agent?: AgentRuntime }) {
  if (item.kind === 'tool-call') return <ToolCall item={item} />
  if (item.kind === 'tool-result') return <ToolResult item={item} />
  if (item.kind === 'permission-request') return <PermissionCard item={item} />
  if (item.kind === 'task-update') return <TaskCard task={item.task} />
  if (item.kind === 'system-event') {
    return <div className="px-1 text-center text-[10px] uppercase tracking-wider text-dim">{item.text}</div>
  }

  const isUser = item.kind === 'user-message'
  return (
    <div className={cn('flex flex-col gap-1', isUser && 'items-end')}>
      <div className="flex items-center gap-1.5 px-1 text-[10px] text-dim">
        {!isUser && agent && (
          <span className="font-medium" style={{ color: agent.color }}>
            {agent.name}
          </span>
        )}
        {isUser && <span>You</span>}
        <span>{timeLabel(item.timestamp)}</span>
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-lg border px-3 py-2 text-sm leading-relaxed',
          isUser ? 'border-line-2 bg-panel-2 text-text' : 'border-line bg-panel text-text',
        )}
      >
        <div className="prose-invert prose-sm [&_p]:my-1 [&_pre]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-bg [&_pre]:p-2 [&_code]:font-mono [&_code]:text-xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.text}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
