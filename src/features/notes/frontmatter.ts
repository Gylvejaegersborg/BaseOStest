// YAML frontmatter — note properties, stored the way Obsidian stores them:
// a `---` block at the very top of the note. Only the YAML subset
// properties need is supported: scalars (text, numbers, booleans, dates,
// null) and lists (block `- item` or inline `[a, b]`).

export type PropValue = string | number | boolean | null | string[]
export type Props = Record<string, PropValue>

export type PropType = 'text' | 'list' | 'number' | 'checkbox' | 'date' | 'datetime' | 'tags'

export interface Frontmatter {
  props: Props
  /** The raw block including both `---` lines and its trailing newline;
   *  '' when the note has none. body === block + content. */
  block: string
  content: string
}

const BLOCK_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)/

export function splitFrontmatter(body: string): Frontmatter {
  const m = BLOCK_RE.exec(body)
  if (!m) return { props: {}, block: '', content: body }
  return { props: parseYaml(m[1]), block: m[0], content: body.slice(m[0].length) }
}

export function contentOf(body: string): string {
  return splitFrontmatter(body).content
}

function unquote(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    try {
      return JSON.parse(s)
    } catch {
      return s.slice(1, -1)
    }
  }
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'")
  return s
}

function scalar(raw: string): PropValue {
  const s = raw.trim()
  if (s === '' || s === '~' || s === 'null') return null
  if (s === 'true') return true
  if (s === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim()
    if (!inner) return []
    return splitInline(inner).map((x) => String(unquote(x.trim())))
  }
  return unquote(s)
}

/** Splits `a, "b, c", d` on commas outside quotes. */
function splitInline(s: string): string[] {
  const out: string[] = []
  let cur = ''
  let q: string | null = null
  for (const ch of s) {
    if (q) {
      cur += ch
      if (ch === q) q = null
    } else if (ch === '"' || ch === "'") {
      q = ch
      cur += ch
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out
}

export function parseYaml(src: string): Props {
  const props: Props = {}
  let listKey: string | null = null
  for (const line of src.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const item = /^\s*-\s*(.*)$/.exec(line)
    if (item && listKey) {
      const list = Array.isArray(props[listKey]) ? (props[listKey] as string[]) : []
      list.push(String(unquote(item[1].trim())))
      props[listKey] = list
      continue
    }
    const kv = /^([^:#\s][^:]*?)\s*:(?:\s+(.*)|\s*)$/.exec(line)
    if (!kv) continue
    const key = kv[1].trim()
    const rest = kv[2] ?? ''
    // `key:` alone is null, unless `- item` lines follow (a block list).
    listKey = rest.trim() ? null : key
    props[key] = rest.trim() ? scalar(rest) : null
  }
  return props
}

function quote(s: string): string {
  const needs =
    s === '' ||
    /^\s|\s$/.test(s) ||
    /: |\s#|^[-?:,[\]{}#&*!|>'"%@`]/.test(s) ||
    /^(true|false|null|~|-?\d+(\.\d+)?)$/.test(s)
  return needs ? JSON.stringify(s) : s
}

export function stringifyYaml(props: Props): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(props)) {
    if (Array.isArray(value)) {
      if (!value.length) lines.push(`${key}: []`)
      else {
        lines.push(`${key}:`)
        for (const v of value) lines.push(`  - ${quote(v)}`)
      }
    } else if (value === null) lines.push(`${key}:`)
    else if (typeof value === 'string') lines.push(`${key}: ${quote(value)}`)
    else lines.push(`${key}: ${value}`)
  }
  return lines.join('\n')
}

/** Rebuilds a body with new properties, keeping the content. An empty
 *  property set removes the block entirely. */
export function withProps(body: string, props: Props): string {
  const { content } = splitFrontmatter(body)
  if (!Object.keys(props).length) return content
  return `---\n${stringifyYaml(props)}\n---\n${content}`
}

/** Sets (or, with `undefined`, removes) one property. */
export function setProp(body: string, key: string, value: PropValue | undefined): string {
  const { props } = splitFrontmatter(body)
  const next = { ...props }
  if (value === undefined) delete next[key]
  else next[key] = value
  return withProps(body, next)
}

export function inferType(key: string, value: PropValue): PropType {
  if (key === 'tags') return 'tags'
  if (key === 'aliases' || key === 'cssclasses') return 'list'
  if (Array.isArray(value)) return 'list'
  if (typeof value === 'boolean') return 'checkbox'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return 'datetime'
  return 'text'
}

/** Coerces a value to fit a property type (used when the type changes). */
export function coerce(value: PropValue, type: PropType): PropValue {
  const asText = Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value)
  switch (type) {
    case 'list':
    case 'tags':
      if (Array.isArray(value)) return value
      return asText ? asText.split(',').map((s) => s.trim()).filter(Boolean) : []
    case 'number': {
      const n = Number(asText)
      return asText && !Number.isNaN(n) ? n : null
    }
    case 'checkbox':
      return value === true || asText === 'true'
    case 'date':
      return /^\d{4}-\d{2}-\d{2}/.test(asText) ? asText.slice(0, 10) : null
    case 'datetime':
      return /^\d{4}-\d{2}-\d{2}/.test(asText) ? asText : null
    default:
      return asText || null
  }
}

export function asList(v: PropValue | undefined): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
