import { useEffect, useRef } from 'react'
import { useHarness } from '../state/harnessStore'
import { Message } from './Message'

export function MessageList() {
  const { state } = useHarness()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages.length])

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {state.messages.map((item) => {
        const agent = item.agentId ? state.agents.find((a) => a.id === item.agentId) : undefined
        return <Message key={item.id} item={item} agent={agent} />
      })}
      <div ref={bottomRef} />
    </div>
  )
}
