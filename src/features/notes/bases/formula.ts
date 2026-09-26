// A small, safe expression language for base formulas (no eval):
//   price * quantity
//   if(status == "done", "✅", "…")
//   daysUntil(release) + " days"
//   file.name.lower()          ← method style: same as lower(file.name)
// Operators: + - * / %  == != > < >= <=  && || !  (and/or/not work too).

export type Value = string | number | boolean | null | string[]

type Node =
  | { t: 'lit'; v: Value }
  | { t: 'ref'; name: string }
  | { t: 'call'; name: string; args: Node[] }
  | { t: 'un'; op: string; a: Node }
  | { t: 'bin'; op: string; a: Node; b: Node }

type Tok = { k: 'num' | 'str' | 'id' | 'op'; v: string }

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1] ?? ''))) {
      let j = i
      while (j < src.length && /[\d.]/.test(src[j])) j++
      out.push({ k: 'num', v: src.slice(i, j) })
      i = j
      continue
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1
      let s = ''
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\' && j + 1 < src.length) j++
        s += src[j++]
      }
      if (j >= src.length) throw new Error('Unclosed string')
      out.push({ k: 'str', v: s })
      i = j + 1
      continue
    }
    if (/[\p{L}_]/u.test(ch)) {
      let j = i
      while (j < src.length && /[\p{L}\p{N}_.]/u.test(src[j])) j++
      out.push({ k: 'id', v: src.slice(i, j).replace(/\.$/, '') })
      i = j
      continue
    }
    const two = src.slice(i, i + 2)
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(two)) {
      out.push({ k: 'op', v: two })
      i += 2
      continue
    }
    if ('+-*/%<>!(),'.includes(ch)) {
      out.push({ k: 'op', v: ch })
      i++
      continue
    }
    throw new Error(`Unexpected "${ch}"`)
  }
  return out
}

export function parseFormula(src: string): Node {
  const toks = tokenize(src)
  let p = 0
  const peek = () => toks[p]
  const isOp = (v: string) => peek()?.k === 'op' && peek()!.v === v
  const isWord = (v: string) => peek()?.k === 'id' && peek()!.v.toLowerCase() === v
  const expect = (v: string) => {
    if (!isOp(v)) throw new Error(`Expected "${v}"`)
    p++
  }

  const or = (): Node => {
    let a = and()
    while (isOp('||') || isWord('or')) {
      p++
      a = { t: 'bin', op: '||', a, b: and() }
    }
    return a
  }
  const and = (): Node => {
    let a = eq()
    while (isOp('&&') || isWord('and')) {
      p++
      a = { t: 'bin', op: '&&', a, b: eq() }
    }
    return a
  }
  const eq = (): Node => {
    let a = cmp()
    while (isOp('==') || isOp('!=')) {
      const op = toks[p++].v
      a = { t: 'bin', op, a, b: cmp() }
    }
    return a
  }
  const cmp = (): Node => {
    let a = add()
    while (isOp('>') || isOp('<') || isOp('>=') || isOp('<=')) {
      const op = toks[p++].v
      a = { t: 'bin', op, a, b: add() }
    }
    return a
  }
  const add = (): Node => {
    let a = mul()
    while (isOp('+') || isOp('-')) {
      const op = toks[p++].v
      a = { t: 'bin', op, a, b: mul() }
    }
    return a
  }
  const mul = (): Node => {
    let a = unary()
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = toks[p++].v
      a = { t: 'bin', op, a, b: unary() }
    }
    return a
  }
  const unary = (): Node => {
    if (isOp('!') || isWord('not')) {
      p++
      return { t: 'un', op: '!', a: unary() }
    }
    if (isOp('-')) {
      p++
      return { t: 'un', op: '-', a: unary() }
    }
    return primary()
  }
  const primary = (): Node => {
    const tok = peek()
    if (!tok) throw new Error('Unexpected end')
    if (tok.k === 'num') {
      p++
      return { t: 'lit', v: Number(tok.v) }
    }
    if (tok.k === 'str') {
      p++
      return { t: 'lit', v: tok.v }
    }
    if (isOp('(')) {
      p++
      const e = or()
      expect(')')
      return e
    }
    if (tok.k === 'id') {
      p++
      const low = tok.v.toLowerCase()
      if (low === 'true') return { t: 'lit', v: true }
      if (low === 'false') return { t: 'lit', v: false }
      if (low === 'null') return { t: 'lit', v: null }
      if (isOp('(')) {
        p++
        const args: Node[] = []
        if (!isOp(')')) {
          args.push(or())
          while (isOp(',')) {
            p++
            args.push(or())
          }
        }
        expect(')')
        // `a.b.lower()` → lower(a.b) when `a.b.lower` isn't a function.
        if (!FNS[low] && tok.v.includes('.')) {
          const dot = tok.v.lastIndexOf('.')
          return { t: 'call', name: tok.v.slice(dot + 1).toLowerCase(), args: [{ t: 'ref', name: tok.v.slice(0, dot) }, ...args] }
        }
        return { t: 'call', name: low, args }
      }
      return { t: 'ref', name: tok.v }
    }
    throw new Error(`Unexpected "${tok.v}"`)
  }

  const node = or()
  if (p < toks.length) throw new Error(`Unexpected "${toks[p].v}"`)
  return node
}

// ---- evaluation -----------------------------------------------------------

const DAY = 86_400_000
const toNum = (v: Value): number => (typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : v == null || v === '' ? 0 : Number(v))
const toStr = (v: Value): string => (v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v))
const truthy = (v: Value) => (Array.isArray(v) ? v.length > 0 : !!v && v !== 'false')
const isEmpty = (v: Value) => v == null || v === '' || (Array.isArray(v) && !v.length)
const dateOf = (v: Value) => {
  const d = new Date(toStr(v).length === 10 ? `${toStr(v)}T00:00:00` : toStr(v))
  return Number.isNaN(d.getTime()) ? null : d
}
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const FNS: Record<string, (args: Value[]) => Value> = {
  if: ([c, a, b]) => (truthy(c) ? a ?? null : b ?? null),
  empty: ([v]) => isEmpty(v),
  lower: ([v]) => toStr(v).toLowerCase(),
  upper: ([v]) => toStr(v).toUpperCase(),
  title: ([v]) => toStr(v).replace(/\b\p{L}/gu, (c) => c.toUpperCase()),
  trim: ([v]) => toStr(v).trim(),
  len: ([v]) => (Array.isArray(v) ? v.length : toStr(v).length),
  length: ([v]) => (Array.isArray(v) ? v.length : toStr(v).length),
  round: ([v, n]) => {
    const f = 10 ** toNum(n ?? 0)
    return Math.round(toNum(v) * f) / f
  },
  floor: ([v]) => Math.floor(toNum(v)),
  ceil: ([v]) => Math.ceil(toNum(v)),
  abs: ([v]) => Math.abs(toNum(v)),
  min: (a) => Math.min(...a.map(toNum)),
  max: (a) => Math.max(...a.map(toNum)),
  number: ([v]) => toNum(v),
  string: ([v]) => toStr(v),
  concat: (a) => a.map(toStr).join(''),
  contains: ([a, b]) => (Array.isArray(a) ? a.some((x) => x.toLowerCase() === toStr(b).toLowerCase()) : toStr(a).toLowerCase().includes(toStr(b).toLowerCase())),
  startswith: ([a, b]) => toStr(a).toLowerCase().startsWith(toStr(b).toLowerCase()),
  join: ([a, sep]) => (Array.isArray(a) ? a.join(sep == null ? ', ' : toStr(sep)) : toStr(a)),
  repeat: ([s, n]) => toStr(s).repeat(Math.max(0, Math.min(100, Math.floor(toNum(n))))),
  now: () => new Date().toISOString().slice(0, 16),
  today: () => ymd(new Date()),
  date: ([v]) => {
    const d = dateOf(v)
    return d ? ymd(d) : null
  },
  year: ([v]) => dateOf(v)?.getFullYear() ?? null,
  month: ([v]) => (dateOf(v) ? dateOf(v)!.getMonth() + 1 : null),
  day: ([v]) => dateOf(v)?.getDate() ?? null,
  daysuntil: ([v]) => {
    const d = dateOf(v)
    return d ? Math.round((new Date(ymd(d) + 'T00:00:00').getTime() - startOfToday().getTime()) / DAY) : null
  },
  dayssince: ([v]) => {
    const d = dateOf(v)
    return d ? Math.round((startOfToday().getTime() - new Date(ymd(d) + 'T00:00:00').getTime()) / DAY) : null
  },
}

export const FORMULA_FUNCTIONS = Object.keys(FNS)

export function evalFormula(node: Node, get: (name: string) => Value): Value {
  switch (node.t) {
    case 'lit':
      return node.v
    case 'ref':
      return get(node.name)
    case 'un': {
      const a = evalFormula(node.a, get)
      return node.op === '!' ? !truthy(a) : -toNum(a)
    }
    case 'call': {
      const fn = FNS[node.name]
      if (!fn) throw new Error(`Unknown function ${node.name}()`)
      // Lazy `if` so the untaken branch can't error.
      if (node.name === 'if') {
        const c = evalFormula(node.args[0], get)
        const branch = truthy(c) ? node.args[1] : node.args[2]
        return branch ? evalFormula(branch, get) : null
      }
      return fn(node.args.map((a) => evalFormula(a, get)))
    }
    case 'bin': {
      if (node.op === '&&') return truthy(evalFormula(node.a, get)) && truthy(evalFormula(node.b, get))
      if (node.op === '||') return truthy(evalFormula(node.a, get)) || truthy(evalFormula(node.b, get))
      const a = evalFormula(node.a, get)
      const b = evalFormula(node.b, get)
      const numeric = typeof a !== 'string' && typeof b !== 'string'
      switch (node.op) {
        case '+':
          return typeof a === 'string' || typeof b === 'string' || Array.isArray(a) || Array.isArray(b) ? toStr(a) + toStr(b) : toNum(a) + toNum(b)
        case '-':
          return toNum(a) - toNum(b)
        case '*':
          return toNum(a) * toNum(b)
        case '/':
          return toNum(b) === 0 ? null : toNum(a) / toNum(b)
        case '%':
          return toNum(a) % toNum(b)
        case '==':
          return numeric && a != null && b != null ? toNum(a) === toNum(b) : toStr(a).toLowerCase() === toStr(b).toLowerCase()
        case '!=':
          return numeric && a != null && b != null ? toNum(a) !== toNum(b) : toStr(a).toLowerCase() !== toStr(b).toLowerCase()
        default: {
          const x = numeric ? toNum(a) : toStr(a)
          const y = numeric ? toNum(b) : toStr(b)
          if (node.op === '>') return x > y
          if (node.op === '<') return x < y
          if (node.op === '>=') return x >= y
          return x <= y
        }
      }
    }
  }
}

const cache = new Map<string, Node | Error>()

/** Parses (cached) and evaluates; errors come back as `{ error }`. */
export function runFormula(src: string, get: (name: string) => Value): { value: Value } | { error: string } {
  let node = cache.get(src)
  if (!node) {
    try {
      node = parseFormula(src)
    } catch (e) {
      node = e as Error
    }
    cache.set(src, node)
  }
  if (node instanceof Error) return { error: node.message }
  try {
    const v = evalFormula(node, get)
    return { value: typeof v === 'number' && !Number.isFinite(v) ? null : v }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
