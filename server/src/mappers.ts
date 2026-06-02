import type { GuildBasedChannel, Message } from 'discord.js'
import { AGENT_COLORS, OPERATOR_USER_IDS } from './config.js'
import type { BridgeChannel, BridgeMessage } from './types.js'

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function mapChannel(channel: GuildBasedChannel): BridgeChannel {
  return { id: channel.id, name: channel.name, unread: 0 }
}

export function mapMessage(msg: Message, botId: string | undefined): BridgeMessage {
  const name = msg.member?.displayName ?? msg.author.username
  const roleColor = msg.member?.displayHexColor
  // Prefer the known agent palette; fall back to the author's top role colour.
  const color =
    AGENT_COLORS[name] ?? (roleColor && roleColor !== '#000000' ? roleColor : undefined)

  const isSelf = msg.author.id === botId || OPERATOR_USER_IDS.includes(msg.author.id)

  return {
    id: msg.id,
    channelId: msg.channelId,
    authorId: msg.author.id,
    authorName: name,
    authorColor: color,
    isSelf,
    time: hhmm(msg.createdAt),
    text: msg.content,
  }
}
