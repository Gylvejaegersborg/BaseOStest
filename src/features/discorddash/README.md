# Discord Bot Dashboard — bridge contract

The dashboard (`DiscordDashPage`) talks to a **bridge service** you run on your
homeserver: a small Node process using `discord.js` that holds the bot token and
exposes a tiny HTTP + WebSocket API. The browser never sees the token.

When `VITE_DISCORD_BRIDGE_URL` is unset (or the service is unreachable) the
dashboard falls back to the bundled mock data in `mockData.ts`, so the Lab keeps
working standalone. The header status dot reflects the real state:

| State        | Meaning                                          |
| ------------ | ------------------------------------------------ |
| `connecting` | reaching the service                             |
| `live`       | connected to the bridge                          |
| `mock`       | no `VITE_DISCORD_BRIDGE_URL` configured          |
| `error`      | service configured but unreachable → mock data   |

## Servers

| Guild ID              | Name         | Role   |
| --------------------- | ------------ | ------ |
| `1383805863860633700` | ISΛRK HQ     | ops    |
| `1488928080394453132` | ISΛRK Public | public |

## HTTP + WS contract (what the service must implement)

```
GET  {base}/guilds/:guildId/channels
     -> Channel[]                 // { id, name, unread }

GET  {base}/guilds/:guildId/channels/:channelId/messages?limit=50
     -> BridgeMessage[]           // oldest → newest

POST {base}/guilds/:guildId/channels/:channelId/messages
     body { content: string }
     -> BridgeMessage             // the echoed, persisted message

WS   {wsBase}/gateway?guild=:guildId
     -> stream of BridgeEvent     // { type: 'message', message } | { type: 'ready' } | { type: 'error', message }
```

Types are defined in [`types.ts`](./types.ts) and consumed by
[`bridgeClient.ts`](./bridgeClient.ts) / [`useDiscordBridge.ts`](./useDiscordBridge.ts).

### Service-side notes
- Map each Discord author to `authorName` and, where possible, an `authorColor`
  (e.g. the agent's palette colour). Set `isSelf: true` for messages the
  operator/bot account sent so they render as **You**.
- Enable the **Message Content** privileged intent on the bot.
- `unread` can be returned as `0` from the API; the dashboard increments it
  client-side as live messages arrive on inactive channels.
