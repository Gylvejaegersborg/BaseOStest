// Adopt orphan audio files in team/inbox/audio/ — i.e. files pushed by the
// homeserver copyparty sync (which uploads raw audio via the contents API and
// cannot create intake records itself). Any audio file not referenced by an
// existing inbox record gets one, with source "copyparty".
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readJson, nowIso, intakeId, writeIntakeRecord, AUDIO_EXT } from './lib.mjs'

const audioDir = 'team/inbox/audio'
const referenced = new Set(
  readdirSync('team/inbox')
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(join('team/inbox', f), {}).filename)
    .filter(Boolean),
)

let added = 0
for (const file of readdirSync(audioDir)) {
  if (!AUDIO_EXT.test(file)) continue
  const path = join(audioDir, file)
  if (referenced.has(path)) continue
  writeIntakeRecord({
    id: intakeId(file),
    source: 'copyparty',
    kind: 'audio',
    receivedAt: nowIso(),
    filename: path,
    from: 'copyparty drop folder',
    subject: file,
    status: 'new',
  })
  added++
  console.log(`intake-copyparty: adopted ${file}`)
}
console.log(`intake-copyparty: done, ${added} new record(s)`)
