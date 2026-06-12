// Poll the artist mailbox over IMAP: audio attachments become beat intake records,
// everything else becomes a "message" record for Hermes to triage (booking/collabs).
// Env: IMAP_HOST, IMAP_PORT (default 993), IMAP_USER, IMAP_PASSWORD.
// Idempotent via the UID watermark in team/state/cursors.json.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import {
  readJson, writeJson, nowIso, intakeId, writeIntakeRecord, AUDIO_EXT, ensureEnv,
} from './lib.mjs'

const env = ensureEnv(['IMAP_HOST', 'IMAP_USER', 'IMAP_PASSWORD'])
if (!env.ok) {
  console.log(`intake-imap: skipped (missing ${env.missing.join(', ')})`)
  process.exit(0)
}

const cursorsPath = 'team/state/cursors.json'
const cursors = readJson(cursorsPath)
const lastUid = cursors.imap.lastUid ?? 0

const client = new ImapFlow({
  host: process.env.IMAP_HOST,
  port: Number(process.env.IMAP_PORT ?? 993),
  secure: true,
  auth: { user: process.env.IMAP_USER, pass: process.env.IMAP_PASSWORD },
  logger: false,
})

let added = 0
let maxUid = lastUid
await client.connect()
try {
  const lock = await client.getMailboxLock('INBOX')
  try {
    for await (const msg of client.fetch(
      { uid: `${lastUid + 1}:*` },
      { source: true, uid: true },
    )) {
      if (msg.uid <= lastUid) continue // the n:* range always matches the last message
      maxUid = Math.max(maxUid, msg.uid)
      const mail = await simpleParser(msg.source)
      const from = mail.from?.text ?? 'unknown'
      const subject = mail.subject ?? '(no subject)'
      const audio = (mail.attachments ?? []).filter((a) => AUDIO_EXT.test(a.filename ?? ''))

      if (audio.length) {
        for (const att of audio) {
          const id = intakeId(att.filename)
          const ext = att.filename.match(AUDIO_EXT)[0].toLowerCase()
          const audioPath = join('team/inbox/audio', `${id}${ext}`)
          mkdirSync('team/inbox/audio', { recursive: true })
          writeFileSync(audioPath, att.content)
          writeIntakeRecord({
            id,
            source: 'email',
            kind: 'audio',
            receivedAt: (mail.date ?? new Date()).toISOString(),
            filename: audioPath,
            from,
            subject,
            status: 'new',
          })
          added++
          console.log(`intake-imap: saved ${att.filename} from ${from}`)
        }
      } else {
        // Booking / collab / inquiry mail — recorded for Hermes, body excerpt only.
        writeIntakeRecord({
          id: intakeId(subject),
          source: 'email',
          kind: 'message',
          receivedAt: (mail.date ?? new Date()).toISOString(),
          filename: '',
          from,
          subject,
          body: (mail.text ?? '').slice(0, 4000),
          status: 'new',
        })
        added++
        console.log(`intake-imap: recorded message "${subject}" from ${from}`)
      }
    }
  } finally {
    lock.release()
  }
} finally {
  await client.logout().catch(() => {})
}

cursors.imap.lastUid = maxUid
writeJson(cursorsPath, cursors)
console.log(`intake-imap: done, ${added} new record(s), uid watermark ${maxUid}`)
