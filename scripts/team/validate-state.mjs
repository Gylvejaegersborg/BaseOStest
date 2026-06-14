// Validates every JSON file under team/ against the shapes in team/README.md.
// Runs after each agent workflow; a non-zero exit fails the run before commit.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const errors = []
const check = (cond, msg) => { if (!cond) errors.push(msg) }

function json(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    errors.push(`${path}: invalid JSON (${err.message})`)
    return null
  }
}

const AGENT_IDS = ['hemera', 'nyx', 'aether', 'hermes', 'mnemosyne', 'theia', 'argus']
const TASK_STATUS = ['backlog', 'doing', 'review', 'blocked', 'done']
const AGENT_STATUS = ['working', 'thinking', 'idle', 'offline']
const APPROVAL_TYPES = ['youtube_upload', 'soundcloud_upload', 'social_post', 'booking_reply', 'site_publish']
const APPROVAL_STATUS = ['pending', 'approved', 'rejected', 'published', 'published (manual)', 'failed']

const agents = json('team/state/agents.json')
if (agents) {
  check(Array.isArray(agents.agents), 'agents.json: .agents must be an array')
  for (const a of agents.agents ?? []) {
    check(AGENT_IDS.includes(a.id), `agents.json: unknown agent id "${a.id}"`)
    check(AGENT_STATUS.includes(a.status), `agents.json: bad status "${a.status}" for ${a.id}`)
    check(typeof a.task === 'string' && a.task.length > 0, `agents.json: ${a.id} missing task`)
  }
}

const tasks = json('team/state/tasks.json')
if (tasks) {
  check(Array.isArray(tasks.tasks), 'tasks.json: .tasks must be an array')
  const ids = new Set()
  for (const t of tasks.tasks ?? []) {
    check(typeof t.id === 'string' && !ids.has(t.id), `tasks.json: missing/duplicate id "${t.id}"`)
    ids.add(t.id)
    check(TASK_STATUS.includes(t.status), `tasks.json: bad status "${t.status}" on ${t.id}`)
    check([...AGENT_IDS, 'user'].includes(t.owner), `tasks.json: bad owner "${t.owner}" on ${t.id}`)
    check(typeof t.title === 'string' && t.title.length > 0, `tasks.json: ${t.id} missing title`)
  }
}

const cursors = json('team/state/cursors.json')
if (cursors) {
  check(typeof cursors.discord === 'object', 'cursors.json: .discord must be an object')
  check(typeof cursors.imap?.lastUid === 'number', 'cursors.json: .imap.lastUid must be a number')
  check(Array.isArray(cursors.copyparty?.seenShas), 'cursors.json: .copyparty.seenShas must be an array')
}

const queue = json('team/approvals/queue.json')
if (queue) {
  check(Array.isArray(queue.items), 'queue.json: .items must be an array')
  for (const i of queue.items ?? []) {
    check(typeof i.id === 'string', 'queue.json: item missing id')
    check(APPROVAL_TYPES.includes(i.type), `queue.json: bad type "${i.type}" on ${i.id}`)
    check(APPROVAL_STATUS.includes(i.status), `queue.json: bad status "${i.status}" on ${i.id}`)
    check(Array.isArray(i.draftPaths), `queue.json: ${i.id} draftPaths must be an array`)
  }
}

const library = json('team/library/beats.json')
if (library) check(Array.isArray(library.beats), 'beats.json: .beats must be an array')

if (existsSync('team/meetings/latest.json')) {
  const m = json('team/meetings/latest.json')
  if (m) {
    check(/^\d{4}-\d{2}-\d{2}$/.test(m.date ?? ''), 'latest.json: bad date')
    check(Array.isArray(m.turns), 'latest.json: .turns must be an array')
    for (const t of m.turns ?? []) {
      check(AGENT_IDS.includes(t.agent), `latest.json: unknown speaker "${t.agent}"`)
      check(typeof t.text === 'string' && t.text.length > 0, 'latest.json: empty turn text')
    }
    for (const k of ['agenda', 'decisions', 'handoffs', 'actionItems']) {
      check(Array.isArray(m[k]), `latest.json: .${k} must be an array`)
    }
  }
}

for (const f of readdirSync('team/inbox').filter((f) => f.endsWith('.json'))) {
  const r = json(join('team/inbox', f))
  if (!r) continue
  check(['discord', 'email', 'copyparty'].includes(r.source), `inbox/${f}: bad source`)
  check(['audio', 'message'].includes(r.kind), `inbox/${f}: bad kind`)
  check(['new', 'analyzed', 'cataloged', 'rejected'].includes(r.status), `inbox/${f}: bad status`)
}

// OS overlay (the user-facing write surface) — arrays of {id} where applicable.
if (existsSync('team/os/overlay.json')) {
  const ov = json('team/os/overlay.json')
  if (ov) {
    for (const k of ['notes', 'reminders', 'tasks', 'projects', 'songs', 'beats', 'library', 'lab']) {
      check(Array.isArray(ov[k]), `os/overlay.json: .${k} must be an array`)
      for (const item of ov[k] ?? []) {
        check(item && typeof item.id === 'string' && item.id.length > 0, `os/overlay.json: ${k}[] item missing id`)
      }
    }
  }
}

if (errors.length) {
  console.error(`team/ state validation FAILED (${errors.length}):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log('team/ state validation OK')
