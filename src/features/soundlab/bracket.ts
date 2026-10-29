// Tournament-style review of the sounds you kept: two at a time, pick the one you prefer, the
// winners meet in the next round, until one is left. Pure logic (no React, no network) so it
// can be checked on its own.
//
// With an odd number in a round, the last player gets a bye (goes straight through). Everyone
// gets ranked by how far they got, so the result is a shortlist order, not only a champion.

export interface Tournament {
  /** Who is playing this round, in match order (pairs: 0-1, 2-3, …). */
  players: string[]
  /** Winners of this round's finished matches (plus a bye, if any). */
  winners: string[]
  /** Which match of this round is up. */
  match: number
  /** 1-based. */
  round: number
  /** The round each eliminated sound lost in. */
  eliminated: Record<string, number>
  champion?: string
}

/** How many rounds a field of `n` takes. */
export const roundsTotal = (n: number) => (n <= 1 ? 0 : Math.ceil(Math.log2(n)))

export function shuffled<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Rolls into the next round (or finishes) once every match in this one has been played. */
function settle(t: Tournament): Tournament {
  const pairs = Math.floor(t.players.length / 2)
  if (t.match < pairs) return t
  const winners = t.players.length % 2 ? [...t.winners, t.players[t.players.length - 1]!] : t.winners
  if (winners.length <= 1) return { ...t, winners, match: pairs, champion: winners[0] }
  return { players: winners, winners: [], match: 0, round: t.round + 1, eliminated: t.eliminated }
}

export function startTournament(ids: string[], rand?: () => number): Tournament {
  const players = shuffled([...new Set(ids)], rand)
  return settle({ players, winners: [], match: 0, round: 1, eliminated: {}, champion: players.length === 1 ? players[0] : undefined })
}

/** The two sounds being compared now, or null when the tournament is over. */
export function currentMatch(t: Tournament): [string, string] | null {
  if (t.champion) return null
  const a = t.players[t.match * 2]
  const b = t.players[t.match * 2 + 1]
  return a && b ? [a, b] : null
}

/** Records which of the current pair won. Returns a new state (the old one is untouched, so it can be kept for undo). */
export function pick(t: Tournament, winner: string): Tournament {
  const m = currentMatch(t)
  if (!m || !m.includes(winner)) return t
  const loser = m[0] === winner ? m[1] : m[0]
  return settle({ ...t, winners: [...t.winners, winner], match: t.match + 1, eliminated: { ...t.eliminated, [loser]: t.round } })
}

/** Best first: the champion, then by how late each sound went out (the final's loser, the semi-final losers, …). */
export function ranking(t: Tournament, all: string[]): string[] {
  const seed = new Map(all.map((id, i) => [id, i]))
  const score = (id: string) => (id === t.champion ? Infinity : (t.eliminated[id] ?? Infinity - 1))
  return [...all].sort((a, b) => score(b) - score(a) || (seed.get(a) ?? 0) - (seed.get(b) ?? 0))
}

/** Matches played / in total, for a progress line. */
export function progress(t: Tournament, n: number): { played: number; total: number } {
  return { played: Object.keys(t.eliminated).length, total: Math.max(0, n - 1) }
}
