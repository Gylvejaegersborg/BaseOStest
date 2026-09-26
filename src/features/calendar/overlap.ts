/** Side-by-side layout for things happening at the same time (Google/
 *  Outlook style): items that overlap — directly or through a chain of
 *  overlaps — form a cluster, and each gets its own column within it. */
export interface Timed {
  id: string
  start: number // fractional hour
  end: number
}

export interface Placed {
  col: number
  cols: number
}

export function layoutOverlaps(items: Timed[]): Map<string, Placed> {
  const out = new Map<string, Placed>()
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end)
  let cluster: { item: Timed; col: number }[] = []
  let clusterEnd = -Infinity
  let colEnds: number[] = []

  const flush = () => {
    const cols = colEnds.length
    for (const c of cluster) out.set(c.item.id, { col: c.col, cols })
    cluster = []
    colEnds = []
  }

  for (const item of sorted) {
    if (item.start >= clusterEnd && cluster.length) flush()
    let col = colEnds.findIndex((end) => end <= item.start)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(item.end)
    } else colEnds[col] = item.end
    cluster.push({ item, col })
    clusterEnd = Math.max(clusterEnd === -Infinity ? item.end : clusterEnd, item.end)
  }
  if (cluster.length) flush()
  return out
}
