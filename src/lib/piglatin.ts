// Deterministic pig-latin lorem generator. Used to fill notes with placeholder
// content until the real Obsidian vault is wired in.

const SEED_WORDS = [
  'the', 'quick', 'brown', 'synth', 'wave', 'rolls', 'over', 'a', 'lazy', 'modem',
  'agents', 'compile', 'beats', 'while', 'the', 'server', 'hums', 'in', 'cold', 'storage',
  'music', 'flows', 'through', 'copper', 'and', 'fiber', 'into', 'the', 'render', 'queue',
  'every', 'project', 'leaves', 'a', 'trail', 'of', 'small', 'decisions', 'and', 'notes',
  'nyx', 'spins', 'up', 'a', 'dozen', 'minds', 'hemera', 'watches', 'claude', 'writes',
  'release', 'the', 'track', 'sync', 'the', 'vault', 'archive', 'the', 'session', 'logs',
]

function pigWord(word: string): string {
  const vowels = 'aeiou'
  const lower = word.toLowerCase()
  if (vowels.includes(lower[0])) return lower + 'way'
  let i = 0
  while (i < lower.length && !vowels.includes(lower[i])) i++
  return lower.slice(i) + lower.slice(0, i) + 'ay'
}

// Mulberry32 PRNG for repeatable output from a numeric seed.
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pigSentence(seed: number, words = 9): string {
  const rand = rng(seed)
  const out: string[] = []
  for (let i = 0; i < words; i++) {
    const w = SEED_WORDS[Math.floor(rand() * SEED_WORDS.length)]
    out.push(pigWord(w))
  }
  const s = out.join(' ')
  return s.charAt(0).toUpperCase() + s.slice(1) + '.'
}

export function pigParagraph(seed: number, sentences = 4): string {
  return Array.from({ length: sentences }, (_, i) =>
    pigSentence(seed * 31 + i, 8 + Math.floor(rng(seed + i)() * 6)),
  ).join(' ')
}

export function pigTitle(seed: number, words = 3): string {
  const rand = rng(seed * 7 + 13)
  return Array.from({ length: words }, () => {
    const w = pigWord(SEED_WORDS[Math.floor(rand() * SEED_WORDS.length)])
    return w.charAt(0).toUpperCase() + w.slice(1)
  }).join(' ')
}
