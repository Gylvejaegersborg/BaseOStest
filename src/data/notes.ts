import { pigParagraph, pigSentence, pigTitle } from '@/lib/piglatin'

export interface Note {
  id: string
  title: string
  folder: string
  tags: string[]
  updated: string // ISO date
  body: string
}

const FOLDERS = ['Music', 'Tech', 'Skills', 'Agents', 'Journal', 'Research', 'Archive']
const TAG_POOL = [
  'release', 'mixing', 'lyrics', 'homeserver', 'agents', 'copyparty', 'idea',
  'todo', 'reference', 'discord', 'shortcuts', 'beats', 'review', 'infra',
]

function tagsFor(seed: number): string[] {
  const n = 1 + (seed % 3)
  const out = new Set<string>()
  for (let i = 0; i < n; i++) out.add(TAG_POOL[(seed * (i + 3)) % TAG_POOL.length])
  return [...out]
}

function bodyFor(seed: number, title: string): string {
  const lines: string[] = []
  lines.push(`# ${title}`)
  lines.push('')
  lines.push(pigParagraph(seed))
  lines.push('')
  lines.push(`## ${pigTitle(seed + 1, 2)}`)
  lines.push('')
  lines.push(`- ${pigSentence(seed + 2, 5)}`)
  lines.push(`- ${pigSentence(seed + 3, 6)}`)
  lines.push(`- ${pigSentence(seed + 4, 4)}`)
  lines.push('')
  if (seed % 3 === 0) {
    lines.push('```ts')
    lines.push(`function ${pigTitle(seed, 1).toLowerCase()}() {`)
    lines.push(`  return "${pigSentence(seed + 9, 4)}"`)
    lines.push('}')
    lines.push('```')
    lines.push('')
  }
  if (seed % 4 === 0) {
    lines.push(`> ${pigSentence(seed + 5, 8)}`)
    lines.push('')
  }
  if (seed % 5 === 0) {
    lines.push('| field | value |')
    lines.push('| --- | --- |')
    lines.push(`| ${pigTitle(seed, 1)} | ${pigTitle(seed + 2, 1)} |`)
    lines.push(`| ${pigTitle(seed + 3, 1)} | ${pigTitle(seed + 4, 1)} |`)
    lines.push('')
  }
  lines.push(`### ${pigTitle(seed + 6, 2)}`)
  lines.push('')
  lines.push(pigParagraph(seed + 7, 3))
  lines.push('')
  lines.push(`See also [${pigTitle(seed + 8, 2)}](#).`)
  return lines.join('\n')
}

function generate(count: number): Note[] {
  const out: Note[] = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const seed = i + 1
    const title = pigTitle(seed, 2 + (seed % 3))
    const folder = FOLDERS[seed % FOLDERS.length]
    const updated = new Date(now - seed * 1000 * 60 * 37).toISOString()
    out.push({
      id: `note-${seed}`,
      title,
      folder,
      tags: tagsFor(seed),
      updated,
      body: bodyFor(seed, title),
    })
  }
  return out
}

export const NOTES: Note[] = generate(320)

export const NOTE_FOLDERS = FOLDERS
export const NOTE_TAGS = TAG_POOL
