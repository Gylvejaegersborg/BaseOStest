import { useHarness } from '../state/harnessStore'
import { MessageList } from './MessageList'
import { Composer } from './Composer'

export function ConversationHeader() {
  const { state } = useHarness()
  const activeAgent = state.agents.find((a) => a.id === state.activeAgentId)

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-4 text-xs text-dim">
      <span>Conversation</span>
      {activeAgent && (
        <>
          <span>·</span>
          <span style={{ color: activeAgent.color }}>{activeAgent.name}</span>
        </>
      )}
    </div>
  )
}

export function ConversationPanel() {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <ConversationHeader />
      <MessageList />
      <Composer />
    </div>
  )
}
