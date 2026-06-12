// Shared helpers for the team scripts. All paths are relative to the repo root,
// which every workflow sets as the working directory.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const TEAM = 'team'

export function readJson(path, fallback = undefined) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    if (fallback !== undefined) return fallback
    throw new Error(`Cannot read JSON ${path}: ${err.message}`)
  }
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

export const nowIso = () => new Date().toISOString()

export function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item'
}

export function intakeId(filename) {
  const date = new Date().toISOString().slice(0, 10)
  const rand = Math.random().toString(36).slice(2, 6)
  return `in-${date}-${slugify(filename)}-${rand}`
}

export const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac|aif|aiff)$/i

/** Record a freshly-created intake id so later workflow steps know what is new. */
export function markNewIntake(id) {
  appendFileSync(process.env.NEW_INTAKE_FILE ?? '/tmp/new-intake.txt', id + '\n')
}

/** Write an intake record + return its JSON path. */
export function writeIntakeRecord(record) {
  const path = join(TEAM, 'inbox', `${record.id}.json`)
  writeJson(path, record)
  markNewIntake(record.id)
  return path
}

/** Parse the minimal YAML frontmatter used by booking drafts (key: value lines). */
export function parseFrontmatter(markdown) {
  const m = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return { meta: {}, body: markdown }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/)
    if (kv) meta[kv[1]] = kv[2].trim()
  }
  return { meta, body: m[2].trim() }
}

/**
 * Build (or refresh) a manual publish package for an approval item: everything the
 * user needs to perform the action by hand, in one folder. Returns the folder path.
 */
export function buildManualPackage(item, extraNote = '') {
  const dir = join(TEAM, 'drafts', 'uploads', item.id)
  mkdirSync(dir, { recursive: true })
  const drafts = (item.draftPaths ?? [])
    .map((p) => {
      try {
        return `\n\n---\n## ${p}\n\n${readFileSync(p, 'utf8')}`
      } catch {
        return `\n\n---\n## ${p}\n\n_(draft file missing)_`
      }
    })
    .join('')
  writeFileSync(
    join(dir, 'checklist.md'),
    `# Manual publish package — ${item.title}\n\n` +
      `Type: \`${item.type}\` · Approved: ${nowIso()}\n\n` +
      `No platform credentials are connected for this action type yet, so the team ` +
      `prepared everything for a manual run. Post/upload the content below by hand, ` +
      `then you're done — the queue entry is already marked resolved.\n` +
      (extraNote ? `\n> ${extraNote}\n` : '') +
      drafts +
      '\n',
  )
  return dir
}

export function loadQueue() {
  return readJson(join(TEAM, 'approvals', 'queue.json'), { updatedAt: nowIso(), items: [] })
}

export function saveQueue(queue) {
  queue.updatedAt = nowIso()
  writeJson(join(TEAM, 'approvals', 'queue.json'), queue)
}

/** Move a resolved item out of the queue into approvals/archive/<id>.json. */
export function archiveItem(queue, item) {
  queue.items = queue.items.filter((i) => i.id !== item.id)
  writeJson(join(TEAM, 'approvals', 'archive', `${item.id}.json`), item)
  saveQueue(queue)
}

export function ensureEnv(names) {
  const missing = names.filter((n) => !process.env[n])
  return { ok: missing.length === 0, missing }
}

export { existsSync }
