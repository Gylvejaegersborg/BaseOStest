// Bridge contract — mirrors src/features/discorddash/types.ts on the frontend.
// Keep the two in sync.

export interface BridgeChannel {
  id: string
  name: string
  unread: number
}

export interface BridgeMessage {
  id: string
  channelId: string
  authorId: string
  authorName: string
  authorColor?: string
  isSelf?: boolean
  time: string
  text: string
}

export type BridgeEvent =
  | { type: 'message'; message: BridgeMessage }
  | { type: 'ready' }
  | { type: 'error'; message: string }
