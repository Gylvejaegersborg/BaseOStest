// Social posts (Instagram/X/TikTok) have no connected APIs — by design for now.
// An approval always yields a copy/paste-ready manual package.
import { buildManualPackage } from '../lib.mjs'

export async function publish(item) {
  const dir = buildManualPackage(item, 'No social platform APIs are connected — post this by hand.')
  return {
    status: 'published (manual)',
    result: `Manual posting package ready at ${dir}.`,
    artifactPath: dir,
  }
}
