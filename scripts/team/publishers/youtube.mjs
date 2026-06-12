// Approved YouTube upload. Needs YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN and a
// rendered video file referenced by the upload package's metadata.json; anything
// missing degrades to a manual upload package (still a useful deliverable).
import { createReadStream, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { buildManualPackage, ensureEnv } from '../lib.mjs'

export async function publish(item) {
  const env = ensureEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'])
  const pkgDir = join('team/drafts/uploads', item.id)
  const metaPath = join(pkgDir, 'metadata.json')

  let meta = null
  if (existsSync(metaPath)) meta = JSON.parse(readFileSync(metaPath, 'utf8'))

  if (!env.ok || !meta?.videoFile || !existsSync(meta.videoFile)) {
    const why = !env.ok
      ? `YouTube credentials not configured (${env.missing.join(', ')})`
      : 'no rendered video file in the upload package (metadata.json → videoFile)'
    const dir = buildManualPackage(item, `Automatic upload unavailable: ${why}.`)
    return {
      status: 'published (manual)',
      result: `Manual upload package ready at ${dir} — ${why}.`,
      artifactPath: dir,
    }
  }

  const { google } = await import('googleapis')
  const oauth2 = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET)
  oauth2.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN })
  const youtube = google.youtube({ version: 'v3', auth: oauth2 })

  // Uploads land private first — going public is a separate, human decision.
  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: meta.title ?? item.title,
        description: meta.description ?? '',
        tags: meta.tags ?? [],
        categoryId: '10', // Music
      },
      status: { privacyStatus: meta.visibility ?? 'private', selfDeclaredMadeForKids: false },
    },
    media: { body: createReadStream(meta.videoFile) },
  })
  return {
    status: 'published',
    result: `Uploaded as ${meta.visibility ?? 'private'}: https://youtu.be/${res.data.id} (flip to public from YouTube Studio).`,
  }
}
