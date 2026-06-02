// Shared contract between the dashboard frontend and the Discord bridge
// service. These types describe the JSON the bot service (Node + discord.js)
// is expected to return — keep them in sync when the backend lands.

export interface Guild {
  /** Discord guild (server) snowflake ID. */
  id: string
  /** Display name shown in the header / switcher. */
  name: string
  /** Coarse role of the server, used only for labelling. */
  kind: 'ops' | 'public'
}

export interface Channel {
  /** Discord channel snowflake ID. */
  id: string
  /** Channel name without the leading '#'. */
  name: string
  /** Unread count. Mock data provides this; live mode computes it client-side. */
  unread: number
}

export interface BridgeMessage {
  /** Discord message snowflake ID (or a synthetic id for local/optimistic sends). */
  id: string
  /** Channel this message belongs to. */
  channelId: string
  /** Author's Discord user ID (or 'you' for the operator in mock mode). */
  authorId: string
  /** Display name of the author. */
  authorName: string
  /**
   * Optional accent colour for the avatar. When omitted, the UI falls back to
   * matching the author name against the known agent palette, then neutral.
   */
  authorColor?: string
  /** True when the message was sent by the operator (rendered as "You"). */
  isSelf?: boolean
  /** Pre-formatted HH:MM timestamp for display. */
  time: string
  /** Message body text. */
  text: string
}

export interface Approval {
  id: string
  /** Author's agent/user ID, resolved for name + colour. */
  authorId: string
  action: string
}

/** Live connection state surfaced in the header status dot. */
export type ConnectionState = 'connecting' | 'live' | 'mock' | 'error'

/** Event envelope pushed over the bridge WebSocket. */
export type BridgeEvent =
  | { type: 'message'; message: BridgeMessage }
  | { type: 'ready' }
  | { type: 'error'; message: string }
