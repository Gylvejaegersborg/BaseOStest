import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import { ChannelType, type Message, type SendableChannels } from 'discord.js'
import { ALLOWED_ORIGIN, GUILDS, PORT } from './config.js'
import { client, startDiscord } from './discord.js'
import { mapChannel, mapMessage } from './mappers.js'
import type { BridgeEvent } from './types.js'

const app = express()
app.use(cors({ origin: ALLOWED_ORIGIN }))
app.use(express.json())

// ── HTTP API ───────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ ok: true, ready: client.isReady(), guilds: GUILDS })
})

app.get('/guilds', (_req, res) => {
  res.json(GUILDS)
})

// Text channels in a guild.
app.get('/guilds/:guildId/channels', async (req, res) => {
  try {
    const guild = await client.guilds.fetch(req.params.guildId)
    const channels = await guild.channels.fetch()
    const text = [...channels.values()]
      .filter((c) => c?.type === ChannelType.GuildText)
      .map((c) => mapChannel(c!))
    res.json(text)
  } catch (e) {
    res.status(502).json({ error: String(e) })
  }
})

// Recent messages in a channel, oldest → newest.
app.get('/guilds/:guildId/channels/:channelId/messages', async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 100)
  try {
    const channel = await client.channels.fetch(req.params.channelId)
    if (!channel?.isTextBased()) {
      res.status(404).json({ error: 'not a text channel' })
      return
    }
    const fetched = await channel.messages.fetch({ limit })
    const msgs = [...fetched.values()].reverse().map((m) => mapMessage(m, client.user?.id))
    res.json(msgs)
  } catch (e) {
    res.status(502).json({ error: String(e) })
  }
})

// Send a message as the bot. This is how the dashboard composer posts.
app.post('/guilds/:guildId/channels/:channelId/messages', async (req, res) => {
  const content = String(req.body?.content ?? '').trim()
  if (!content) {
    res.status(400).json({ error: 'content required' })
    return
  }
  try {
    const channel = await client.channels.fetch(req.params.channelId)
    if (!channel?.isTextBased() || !channel.isSendable()) {
      res.status(404).json({ error: 'channel not sendable' })
      return
    }
    const sent = await (channel as SendableChannels).send(content)
    res.json(mapMessage(sent, client.user?.id))
  } catch (e) {
    res.status(502).json({ error: String(e) })
  }
})

// ── WebSocket gateway ────────────────────────────────────────────────────────

const server = createServer(app)
const wss = new WebSocketServer({ noServer: true })
const subscribers = new Map<string, Set<WebSocket>>() // guildId → sockets

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '', 'http://localhost')
  if (url.pathname !== '/gateway') {
    socket.destroy()
    return
  }
  const guildId = url.searchParams.get('guild') ?? ''
  wss.handleUpgrade(req, socket, head, (ws) => {
    const set = subscribers.get(guildId) ?? new Set<WebSocket>()
    set.add(ws)
    subscribers.set(guildId, set)
    ws.on('close', () => set.delete(ws))
    if (client.isReady()) ws.send(JSON.stringify({ type: 'ready' } satisfies BridgeEvent))
  })
})

function broadcast(guildId: string, event: BridgeEvent): void {
  const set = subscribers.get(guildId)
  if (!set) return
  const data = JSON.stringify(event)
  for (const ws of set) if (ws.readyState === WebSocket.OPEN) ws.send(data)
}

// Push every new guild message to that guild's dashboard subscribers.
client.on('messageCreate', (msg: Message) => {
  if (!msg.guildId) return
  broadcast(msg.guildId, { type: 'message', message: mapMessage(msg, client.user?.id) })
})

// ── Boot ─────────────────────────────────────────────────────────────────────

startDiscord()
  .then(() => {
    client.once('ready', () => {
      console.log(`[bridge] discord ready as ${client.user?.tag}`)
      for (const set of subscribers.values()) {
        for (const ws of set) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ready' } satisfies BridgeEvent))
          }
        }
      }
    })
    server.listen(PORT, () => console.log(`[bridge] listening on :${PORT} (cors: ${ALLOWED_ORIGIN})`))
  })
  .catch((e) => {
    console.error('[bridge] failed to start:', e)
    process.exit(1)
  })
