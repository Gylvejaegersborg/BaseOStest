// SoundCloud's public API is application-gated (new app registrations require
// approval), so until ISΛRK is granted access this always produces a manual
// upload package. Swap in a real uploader here once SOUNDCLOUD_* secrets exist.
import { buildManualPackage } from '../lib.mjs'

export async function publish(item) {
  const dir = buildManualPackage(
    item,
    'SoundCloud API access is application-gated and not connected yet — upload by hand at soundcloud.com/upload using the metadata below.',
  )
  return {
    status: 'published (manual)',
    result: `Manual SoundCloud package ready at ${dir}.`,
    artifactPath: dir,
  }
}
