import { NAV_SECTIONS, type SectionId } from '@/data/sections'
import { projectsForSection } from '@/data/projects'

export interface Body {
  key: string
  kind: 'sun' | 'planet'
  x: number
  y: number
  /** Depth for the 3D scene. 2D consumers (fallback SVG) simply ignore it. */
  z: number
  r: number
  label: string
  accent: string
  sectionId: SectionId
  projectId?: string
  /** Planet-only: orbit radius/speed/phase around its sun, used by the 3D scene
   *  to animate continuous orbital motion without re-deriving from x/y. */
  orbit?: { radius: number; speed: number; phase: number; tiltDeg: number }
}

export const VIEW_W = 1200
export const VIEW_H = 700

/** World-space scale shared by the 3D scene and anything (e.g. the HUD's
 *  camera fly-to) that needs to convert a Body's 2D-canvas coordinates into
 *  the same three.js world position Scene3D renders it at. Keeping this in
 *  one place means a click handler outside the Canvas can compute a fly-to
 *  target without duplicating the scene's constants. */
export const SCENE_SCALE = 1 / 32

export function toSceneVec3(b: Pick<Body, 'x' | 'y' | 'z'>): [number, number, number] {
  return [(b.x - VIEW_W / 2) * SCENE_SCALE, -(b.y - VIEW_H / 2) * SCENE_SCALE, b.z * SCENE_SCALE]
}

/** Deterministic string hash → [0, 1). Used to derive z-depth procedurally so
 *  every section gets a stable, spread-out depth without hand-tuning a table. */
function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // Fold to unsigned and normalise.
  return ((h >>> 0) % 10000) / 10000
}

const SUN_Z_RANGE = 160 // suns spread roughly ±80 units of depth

function sunZ(sectionId: SectionId): number {
  return (hash01(`sun:${sectionId}`) - 0.5) * SUN_Z_RANGE
}

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
    const z = sunZ(s.id)
    suns.push({
      key: `sun-${s.id}`,
      kind: 'sun',
      x: pos.x,
      y: pos.y,
      z,
      r: 16,
      label: s.label,
      accent: s.accent,
      sectionId: s.id,
    })

    const projs = projectsForSection(s.id)
    projs.forEach((p, i) => {
      const angle = (Math.PI * 2 * i) / projs.length + s.id.length // varied start
      const radius = 78 + (i % 2) * 22
      // Deterministic per-planet orbit parameters derived from its id, so the
      // 3D scene can animate continuous motion without re-deriving from x/y.
      const speed = 0.15 + hash01(`speed:${p.id}`) * 0.25
      const tiltDeg = (hash01(`tilt:${p.id}`) - 0.5) * 40
      planets.push({
        key: `planet-${p.id}`,
        kind: 'planet',
        x: pos.x + Math.cos(angle) * radius,
        y: pos.y + Math.sin(angle) * radius * 0.8,
        z,
        r: 6,
        label: p.name,
        accent: s.accent,
        sectionId: s.id,
        projectId: p.id,
        orbit: { radius, speed, phase: angle, tiltDeg },
      })
    })
  }

  return { suns, planets }
}

export function sunPos(id: SectionId) {
  return SUN_POS[id]
}
