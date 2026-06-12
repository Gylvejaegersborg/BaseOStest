// Resolve one approval queue entry. This is the ONLY code path that may publish
// anything, and it only runs from team-publish.yml, which only the user dispatches.
// Env: ACTION_ID, DECISION (approve|reject).
import { writeFileSync } from 'node:fs'
import { loadQueue, archiveItem, nowIso } from './lib.mjs'

const actionId = process.env.ACTION_ID
const decision = process.env.DECISION
if (!actionId || !['approve', 'reject'].includes(decision)) {
  console.error('resolve-approval: need ACTION_ID and DECISION=approve|reject')
  process.exit(1)
}

const queue = loadQueue()
const item = queue.items.find((i) => i.id === actionId)
if (!item) {
  console.error(`resolve-approval: no queue item "${actionId}". Pending ids: ${queue.items.filter((i) => i.status === 'pending').map((i) => i.id).join(', ') || '(none)'}`)
  process.exit(1)
}
if (item.status !== 'pending') {
  console.error(`resolve-approval: "${actionId}" is "${item.status}", not pending — refusing (double dispatch?)`)
  process.exit(1)
}

if (decision === 'reject') {
  item.status = 'rejected'
  item.resolvedAt = nowIso()
  item.result = 'Rejected by ISΛRK from the dashboard/Actions UI.'
  archiveItem(queue, item)
  console.log(`resolve-approval: ${actionId} rejected and archived`)
  process.exit(0)
}

const publishers = {
  youtube_upload: () => import('./publishers/youtube.mjs'),
  soundcloud_upload: () => import('./publishers/soundcloud.mjs'),
  social_post: () => import('./publishers/social.mjs'),
  booking_reply: () => import('./publishers/email.mjs'),
  site_publish: () => import('./publishers/site.mjs'),
}

let outcome
try {
  const mod = await publishers[item.type]()
  outcome = await mod.publish(item)
} catch (err) {
  outcome = { status: 'failed', result: `Publisher threw: ${err.message}` }
}

item.status = outcome.status
item.resolvedAt = nowIso()
item.result = outcome.result
archiveItem(queue, item)

// Step output for the workflow: artifact path (manual packages) + summary.
writeFileSync('/tmp/publish-output.json', JSON.stringify(outcome, null, 2))
console.log(`resolve-approval: ${actionId} -> ${outcome.status} — ${outcome.result}`)
if (outcome.status === 'failed') process.exit(1)
