// Promote a cataloged beat onto the artist site/beat store: copy the audio into
// public/beats/audio/ and flip the library entry public. Fully deterministic,
// no external services — the "publish" is the git commit the workflow makes.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { readJson, writeJson, nowIso } from '../lib.mjs'

export async function publish(item) {
  // Contract: a metadata.json among draftPaths with { beatId, audioSource, targetFilename? }
  const metaPath = (item.draftPaths ?? []).find((p) => p.endsWith('metadata.json'))
  if (!metaPath || !existsSync(metaPath)) {
    return { status: 'failed', result: 'site_publish needs a metadata.json draft with { beatId, audioSource }' }
  }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  if (!meta.beatId || !meta.audioSource || !existsSync(meta.audioSource)) {
    return { status: 'failed', result: `metadata.json invalid or audio missing (${meta.audioSource})` }
  }

  const target = join('public/beats/audio', meta.targetFilename ?? basename(meta.audioSource))
  mkdirSync('public/beats/audio', { recursive: true })
  copyFileSync(meta.audioSource, target)

  const library = readJson('team/library/beats.json', { updatedAt: nowIso(), beats: [] })
  const beat = library.beats.find((b) => b.id === meta.beatId)
  if (!beat) {
    return { status: 'failed', result: `Beat "${meta.beatId}" not found in team/library/beats.json` }
  }
  beat.public = true
  beat.audioFile = `/beats/audio/${basename(target)}`
  library.updatedAt = nowIso()
  writeJson('team/library/beats.json', library)

  return {
    status: 'published',
    result: `${beat.title ?? meta.beatId} is live on the site: ${beat.audioFile} (library entry flagged public).`,
  }
}
