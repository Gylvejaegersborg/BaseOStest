import { NAV_SECTIONS, type SectionId } from '@/data/sections'
import { projectsForSection } from '@/data/projects'

export interface Body {
  key: string
  kind: 'sun' | 'planet'
  x: number
  y: number
  r: number
  label: string
  accent: string
  sectionId: SectionId
  projectId?: string
}

export const VIEW_W = 1200
export const VIEW_H = 700

// Hand-placed sun positions for a balanced constellation. Projects (hub) sits
// near the centre so the others read as orbiting it.
const SUN_POS: Record<string, { x: number; y: number }> = {
  notes: { x: 250, y: 175 },
  chat: { x: 540, y: 110 },
  calendar: { x: 850, y: 180 },
  projects: { x: 600, y: 365 },
  lab: { x: 200, y: 440 },
  room: { x: 910, y: 470 },
  team: { x: 760, y: 555 },
  ops: { x: 1060, y: 300 },
  weather: { x: 540, y: 585 },
}

// Constellation outline: which suns are linked by faint lines.
export const SUN_LINKS: [SectionId, SectionId][] = [
  ['notes', 'chat'],
  ['chat', 'calendar'],
  ['calendar', 'ops'],
  ['ops', 'room'],
  ['room', 'lab'],
  ['lab', 'notes'],
  ['projects', 'notes'],
  ['projects', 'calendar'],
  ['projects', 'room'],
  ['projects', 'lab'],
  ['projects', 'weather'],
  ['projects', 'team'],
  ['team', 'room'],
  ['team', 'weather'],
  ['weather', 'lab'],
  ['weather', 'room'],
]

export function buildBodies(): { suns: Body[]; planets: Body[] } {
  const suns: Body[] = []
  const planets: Body[] = []

  for (const s of NAV_SECTIONS) {
    // Sections without a hand-placed spot fall back to centre instead of crashing.
    const pos = SUN_POS[s.id] ?? { x: VIEW_W / 2, y: VIEW_H / 2 }
    suns.push({
      key: `sun-${s.id}`,
      kind: 'sun',
      x: pos.x,
      y: pos.y,
      r: 16,
      label: s.label,
      accent: s.accent,
      sectionId: s.id,
    })

    const projs = projectsForSection(s.id)
    projs.forEach((p, i) => {
      const angle = (Math.PI * 2 * i) / projs.length + s.id.length // varied start
      const radius = 78 + (i % 2) * 22
      planets.push({
        key: `planet-${p.id}`,
        kind: 'planet',
        x: pos.x + Math.cos(angle) * radius,
        y: pos.y + Math.sin(angle) * radius * 0.8,
        r: 6,
        label: p.name,
        accent: s.accent,
        sectionId: s.id,
        projectId: p.id,
      })
    })
  }

  return { suns, planets }
}

export function sunPos(id: SectionId) {
  return SUN_POS[id]
}
