// A canvas is stored as a note of kind 'canvas' whose body is this JSON —
// close to Obsidian's JSON Canvas, plus freehand strokes and shapes.

export type Side = 'top' | 'right' | 'bottom' | 'left'

export interface CanvasNode {
  id: string
  type: 'text' | 'file' | 'link' | 'group' | 'image'
  x: number
  y: number
  width: number
  height: number
  text?: string
  /** file: the embedded note's id. */
  noteId?: string
  url?: string
  label?: string
  /** image: `idb:<key>` for pasted/dropped images, or a URL. */
  src?: string
  color?: string
}

export interface CanvasEdge {
  id: string
  fromNode: string
  toNode: string
  fromSide?: Side
  toSide?: Side
  label?: string
  color?: string
}

export interface Stroke {
  id: string
  tool: 'pen' | 'highlighter'
  color: string
  width: number
  /** Flat [x0, y0, x1, y1, …] in canvas coordinates. */
  points: number[]
}

export interface Shape {
  id: string
  type: 'rect' | 'ellipse' | 'arrow' | 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  width: number
  fill?: boolean
}

export interface CanvasData {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  strokes: Stroke[]
  shapes: Shape[]
  viewport?: { x: number; y: number; zoom: number }
}

export function emptyCanvas(): CanvasData {
  return { nodes: [], edges: [], strokes: [], shapes: [] }
}

export function parseCanvas(body: string): CanvasData {
  try {
    const raw = JSON.parse(body) as Partial<CanvasData>
    return {
      nodes: raw.nodes ?? [],
      edges: raw.edges ?? [],
      strokes: raw.strokes ?? [],
      shapes: raw.shapes ?? [],
      viewport: raw.viewport,
    }
  } catch {
    return emptyCanvas()
  }
}
