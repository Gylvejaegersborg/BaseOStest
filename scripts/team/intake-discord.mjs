// Poll Discord channels for new audio attachments (beat drops).
// Env: DISCORD_BOT_TOKEN, DISCORD_INTAKE_CHANNELS (comma-separated channel ids).
// Uses plain REST so no discord.js dependency is needed; idempotent via
// team/state/cursors.json (snowflake watermark per channel).
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  readJson, writeJson, nowIso, intakeId, writeIntakeRecord, AUDIO_EXT, ensureEnv,
} from './lib.mjs'

const env = ensureEnv(['DISCORD_BOT_TOKEN'])
const channels = (process.env.DISCORD_INTAKE_CHANNELS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
if (!env.ok || channels.length === 0) {
  console.log(`intake-discord: skipped (missing ${[...env.missing, ...(channels.length ? [] : ['DISCORD_INTAKE_CHANNELS'])].join(', ')})`)
  process.exit(0)
}

const API = 'https://discord.com/api/v10'
const headers = { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
const cursorsPath = 'team/state/cursors.json'
const cursors = readJson(cursorsPath)
let added = 0

for (const channelId of channels) {
  const after = cursors.discord[channelId]
  let url = `${API}/channels/${channelId}/messages?limit=100${after ? `&after=${after}` : ''}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    console.error(`intake-discord: channel ${channelId} HTTP ${res.status} — skipping`)
    continue
  }
  // Discord returns newest first; process oldest first for stable cursors.
  const messages = (await res.json()).reverse()
  for (const msg of messages) {
    for (const att of msg.attachments ?? []) {
      if (!AUDIO_EXT.test(att.filename)) continue
      const id = intakeId(att.filename)
      const ext = att.filename.match(AUDIO_EXT)[0].toLowerCase()
      const audioPath = join('team/inbox/audio', `${id}${ext}`)
      const file = await fetch(att.url)
      if (!file.ok) {
        console.error(`intake-discord: download failed for ${att.filename} (HTTP ${file.status})`)
        continue
      }
      mkdirSync('team/inbox/audio', { recursive: true })
      writeFileSync(audioPath, Buffer.from(await file.arrayBuffer()))
      writeIntakeRecord({
        id,
        source: 'discord',
        kind: 'audio',
        receivedAt: msg.timestamp ?? nowIso(),
        filename: audioPath,
        from: msg.author?.username ?? 'unknown',
        subject: (msg.content ?? '').slice(0, 200),
        status: 'new',
      })
      added++
      console.log(`intake-discord: saved ${att.filename} -> ${audioPath}`)
    }
    // Snowflakes are ordered; the last processed message is the new watermark.
    cursors.discord[channelId] = msg.id
  }
}

writeJson(cursorsPath, cursors)
console.log(`intake-discord: done, ${added} new audio file(s)`)
