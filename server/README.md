# ISΛRK Discord Bridge

The backend that connects the **Discord Bot Dashboard** (in the Lab) to your real
Discord servers. It holds the bot token and exposes a small HTTP + WebSocket API
the dashboard consumes. Run it on your homeserver.

```
Discord ──gateway──► this service (discord.js) ──HTTP + WS──► DiscordDashPage
                     - holds the bot token        - channels / messages / send
                     - streams new messages         - live updates over /gateway
```

## Servers

| Guild ID              | Name         | Role   |
| --------------------- | ------------ | ------ |
| `1383805863860633700` | ISΛRK HQ     | ops    |
| `1488928080394453132` | ISΛRK Public | public |

## Setup

1. **Bot + intents.** In the [Discord developer portal](https://discord.com/developers/applications),
   open your application → **Bot** → enable the **Message Content Intent**
   (privileged). Invite the bot to both servers with `View Channels`,
   `Read Message History` and `Send Messages` permissions.
2. **Configure.** `cp .env.example .env` and fill in:
   - `DISCORD_BOT_TOKEN` — the bot token (never commit it).
   - `ALLOWED_ORIGIN` — your dashboard's origin (or `*` for local dev).
   - `OPERATOR_USER_IDS` — optional; your Discord user ID so your own messages
     render as **You**.
3. **Run.**
   ```bash
   cd server
   npm install
   npm run dev      # tsx watch, hot reload
   # or: npm run build && npm start   for production
   ```
4. **Point the dashboard at it.** In the repo root, set
   `VITE_DISCORD_BRIDGE_URL=http://localhost:8787` (see root `.env.example`) and
   reload the app. The header status dot flips from *Demo* to *Connected*.

## API

| Method | Path | Returns |
| ------ | ---- | ------- |
| `GET`  | `/health` | `{ ok, ready, guilds }` |
| `GET`  | `/guilds` | `Guild[]` |
| `GET`  | `/guilds/:guildId/channels` | `BridgeChannel[]` |
| `GET`  | `/guilds/:guildId/channels/:channelId/messages?limit=50` | `BridgeMessage[]` (oldest→newest) |
| `POST` | `/guilds/:guildId/channels/:channelId/messages` `{ content }` | `BridgeMessage` |
| `WS`   | `/gateway?guild=:guildId` | stream of `BridgeEvent` |

Types live in [`src/types.ts`](./src/types.ts) and mirror the frontend's
`src/features/discorddash/types.ts`.

## Security
- The bot token lives only in this service's `.env` — it is never sent to the browser.
- Restrict `ALLOWED_ORIGIN` to your dashboard origin in production.
- Put the service behind your reverse proxy / VPN; it has no auth of its own yet
  (a shared-secret header is a sensible next addition).
