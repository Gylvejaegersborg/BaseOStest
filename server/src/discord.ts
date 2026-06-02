import { Client, GatewayIntentBits, Partials } from 'discord.js'
import { TOKEN } from './config.js'

// The bot client. Message Content is a privileged intent — enable it in the
// Discord developer portal for this application.
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
})

export async function startDiscord(): Promise<void> {
  if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN is not set — see server/.env.example')
  await client.login(TOKEN)
}
