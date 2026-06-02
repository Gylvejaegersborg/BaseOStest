import type { BridgeEvent, BridgeMessage, Channel } from './types'

// Thin typed client for the Discord bridge service. Every function performs a
// plain fetch against the documented contract and throws on any failure — the
// hook (useDiscordBridge) decides whether to fall back to mock data. Nothing
// here knows about React.
//
// Contract the bot service (Node + discord.js) must implement:
//   GET  {base}/guilds/:guildId/channels                       -> Channel[]
//   GET  {base}/guilds/:guildId/channels/:channelId/messages   -> BridgeMessage[]
//   POST {base}/guilds/:guildId/channels/:channelId/messages   { content } -> BridgeMessage
//   WS   {wsBase}/gateway?guild=:guildId                        -> BridgeEvent stream
//
// The bot token lives only on the service; it is never exposed here.

const BASE = import.meta.env.VITE_DISCORD_BRIDGE_URL?.replace(/\/$/, '')

/** Whether a bridge service URL is configured at build time. */
export function bridgeConfigured(): boolean {
  return Boolean(BASE)
}

async function getJSON<T>(path: string): Promise<T> {
  if (!BASE) throw new Error('bridge not configured')
  const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`bridge ${res.status} on ${path}`)
  return res.json() as Promise<T>
}

export function fetchChannels(guildId: string): Promise<Channel[]> {
  return getJSON<Channel[]>(`/guilds/${guildId}/channels`)
}

export function fetchMessages(guildId: string, channelId: string): Promise<BridgeMessage[]> {
  return getJSON<BridgeMessage[]>(`/guilds/${guildId}/channels/${channelId}/messages?limit=50`)
}

export async function sendMessage(
  guildId: string,
  channelId: string,
  content: string,
): Promise<BridgeMessage> {
  if (!BASE) throw new Error('bridge not configured')
  const res = await fetch(`${BASE}/guilds/${guildId}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`bridge ${res.status} on send`)
  return res.json() as Promise<BridgeMessage>
}

function wsURL(guildId: string): string | null {
  const explicit = import.meta.env.VITE_DISCORD_BRIDGE_WS
  if (explicit) return `${explicit.replace(/\/$/, '')}?guild=${guildId}`
  if (!BASE) return null
  const ws = BASE.replace(/^http/, 'ws')
  return `${ws}/gateway?guild=${guildId}`
}

/**
 * Open the live gateway for a guild. Returns a disposer that closes the socket.
 * Auto-reconnects with backoff until disposed. Calls `onEvent` for each parsed
 * event and `onStatus` when the socket opens/closes so the UI can reflect it.
 */
export function openGateway(
  guildId: string,
  onEvent: (e: BridgeEvent) => void,
  onStatus: (open: boolean) => void,
): () => void {
  const url = wsURL(guildId)
  if (!url) return () => {}

  let socket: WebSocket | null = null
  let retry = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  const connect = () => {
    if (disposed) return
    try {
      socket = new WebSocket(url)
    } catch {
      schedule()
      return
    }
    socket.onopen = () => {
      retry = 0
      onStatus(true)
    }
    socket.onmessage = (ev) => {
      try {
        onEvent(JSON.parse(ev.data) as BridgeEvent)
      } catch {
        /* ignore malformed frames */
      }
    }
    socket.onclose = () => {
      onStatus(false)
      schedule()
    }
    socket.onerror = () => socket?.close()
  }

  const schedule = () => {
    if (disposed) return
    const delay = Math.min(1000 * 2 ** retry, 16000)
    retry += 1
    timer = setTimeout(connect, delay)
  }

  connect()

  return () => {
    disposed = true
    clearTimeout(timer)
    socket?.close()
  }
}
