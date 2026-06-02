import 'dotenv/config'

export const PORT = Number(process.env.PORT ?? 8787)
export const TOKEN = process.env.DISCORD_BOT_TOKEN ?? ''
export const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*'

// Users whose messages render as "You" in the dashboard (alongside the bot).
export const OPERATOR_USER_IDS = (process.env.OPERATOR_USER_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// The two real ISΛRK servers. Mirrors src/features/discorddash/mockData.ts.
export const GUILDS = [
  { id: '1383805863860633700', name: 'ISΛRK HQ', kind: 'ops' as const },
  { id: '1488928080394453132', name: 'ISΛRK Public', kind: 'public' as const },
]

// Known agent display names → palette colour (mirrors src/data/agents.ts), so
// agents keep their colour in the dashboard avatars.
export const AGENT_COLORS: Record<string, string> = {
  Claude: '#36e0c8',
  Hemera: '#f0a020',
  Nyx: '#e0408a',
  'Nyx·w1': '#e0408a',
  'Nyx·w2': '#e0408a',
}
