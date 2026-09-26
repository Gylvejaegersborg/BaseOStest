import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowUpRight,
  Circle,
  Eraser,
  ExternalLink,
  FileText,
  Globe,
  Hand,
  Highlighter,
  Maximize,
  Minus,
  MousePointer2,
  PenLine,
  Plus,
  Redo2,
  Square,
  StickyNote,
  Undo2,
} from 'lucide-react'
import type { Note } from '@/data/notes'
import { cn } from '@/lib/cn'
import { contentOf } from '../frontmatter'
import { openContextMenu } from '../menuBus'
import type { MenuItem } from '../ContextMenu'
import { NOTE_MIME } from '../FileTree'
import { imageSize, imageUrl, putImage } from './imageStore'
import { parseCanvas, type CanvasData, type CanvasEdge, type CanvasNode, type Shape, type Side, type Stroke } from './types'

// A canvas note: an infinite board of cards (text, embedded notes, links,
// images, groups) joined by arrows, plus a freehand/shape ink layer —
// Obsidian Canvas with Excalidraw-style drawing on top.

type Tool = 'select' | 'hand' | 'text' | 'pen' | 'highlighter' | 'eraser' | 'rect' | 'ellipse' | 'arrow'

const INK = ['#e6ebf0', '#e05c67', '#f0a020', '#e6d05c', '#46d369', '#53bed2', '#ac92d9']
/** Obsidian's canvas colour slots 1–6. */
const NODE_COLORS: Record<string, string> = {
  '1': '#e05c67',
  '2': '#f0a020',
  '3': '#e6d05c',
  '4': '#46d369',
  '5': '#53bed2',
  '6': '#ac92d9',
}
const nodeColor = (c?: string) => (c ? NODE_COLORS[c] ?? c : undefined)
const markerId = (c: string) => `cv-arrow-${c.replace(/[^\w]/g, '')}`

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

interface Vp {
  x: number
  y: number
  zoom: number
}

type Drag =
  | { kind: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { kind: 'move'; sx: number; sy: number; before: CanvasData; moved: boolean }
  | { kind: 'resize'; id: string; sx: number; sy: number; w: number; h: number; before: CanvasData }
  | { kind: 'shape-end'; id: string; end: 1 | 2; before: CanvasData }
  | { kind: 'edge'; from: string; side: Side; x: number; y: number }
  | { kind: 'marquee'; sx: number; sy: number; x: number; y: number; additive: boolean }
  | { kind: 'draw'; stroke: Stroke }
  | { kind: 'shape'; shape: Shape }
  | { kind: 'erase'; before: CanvasData; erased: boolean }

// ---- geometry ---------------------------------------------------------------

function anchor(n: CanvasNode, side: Side): [number, number] {
  switch (side) {
    case 'top':
      return [n.x + n.width / 2, n.y]
    case 'bottom':
      return [n.x + n.width / 2, n.y + n.height]
    case 'left':
      return [n.x, n.y + n.height / 2]
    case 'right':
      return [n.x + n.width, n.y + n.height / 2]
  }
}

function bestSides(a: CanvasNode, b: CanvasNode): [Side, Side] {
  const dx = b.x + b.width / 2 - (a.x + a.width / 2)
  const dy = b.y + b.height / 2 - (a.y + a.height / 2)
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? ['right', 'left'] : ['left', 'right']
  return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom']
}

const NORMAL: Record<Side, [number, number]> = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }

function edgePath(a: CanvasNode, b: CanvasNode, e: CanvasEdge) {
  const [sa, sb] = bestSides(a, b)
  const fs = e.fromSide ?? sa
  const ts = e.toSide ?? sb
  const [x1, y1] = anchor(a, fs)
  const [x2, y2] = anchor(b, ts)
  const d = Math.min(160, Math.hypot(x2 - x1, y2 - y1) / 2 + 20)
  const c1 = [x1 + NORMAL[fs][0] * d, y1 + NORMAL[fs][1] * d]
  const c2 = [x2 + NORMAL[ts][0] * d, y2 + NORMAL[ts][1] * d]
  // Midpoint of the cubic, for the label.
  const mx = 0.125 * x1 + 0.375 * c1[0] + 0.375 * c2[0] + 0.125 * x2
  const my = 0.125 * y1 + 0.375 * c1[1] + 0.375 * c2[1] + 0.125 * y2
  return { d: `M${x1},${y1} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`, mx, my }
}

function strokePath(pts: number[]): string {
  if (pts.length < 4) return pts.length === 2 ? `M${pts[0]},${pts[1]} l0.01,0` : ''
  let d = `M${pts[0]},${pts[1]}`
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2
    const my = (pts[i + 1] + pts[i + 3]) / 2
    d += ` Q${pts[i]},${pts[i + 1]} ${mx},${my}`
  }
  return `${d} L${pts[pts.length - 2]},${pts[pts.length - 1]}`
}

type Box = { x: number; y: number; w: number; h: number }

function strokeBox(s: Stroke): Box {
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (let i = 0; i < s.points.length; i += 2) {
    x1 = Math.min(x1, s.points[i])
    x2 = Math.max(x2, s.points[i])
    y1 = Math.min(y1, s.points[i + 1])
    y2 = Math.max(y2, s.points[i + 1])
  }
  const pad = s.width / 2
  return { x: x1 - pad, y: y1 - pad, w: x2 - x1 + pad * 2, h: y2 - y1 + pad * 2 }
}

const shapeBox = (s: Shape): Box => ({ x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) })
const nodeBox = (n: CanvasNode): Box => ({ x: n.x, y: n.y, w: n.width, h: n.height })
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len)) : 0
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function hitsStroke(s: Stroke, x: number, y: number, r: number) {
  for (let i = 0; i < s.points.length - 2; i += 2) {
    if (distToSegment(x, y, s.points[i], s.points[i + 1], s.points[i + 2], s.points[i + 3]) <= r + s.width / 2) return true
  }
  return s.points.length === 2 && Math.hypot(x - s.points[0], y - s.points[1]) <= r + s.width / 2
}

function hitsShape(s: Shape, x: number, y: number, r: number) {
  if (s.type === 'arrow' || s.type === 'line') return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) <= r + s.width
  const b = shapeBox(s)
  if (s.type === 'ellipse') {
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const d = Math.hypot((x - cx) / (b.w / 2 || 1), (y - cy) / (b.h / 2 || 1))
    return Math.abs(d - 1) * Math.min(b.w, b.h) / 2 <= r + s.width || (s.fill ? d <= 1 : false)
  }
  const inX = x >= b.x - r && x <= b.x + b.w + r
  const inY = y >= b.y - r && y <= b.y + b.h + r
  if (!inX || !inY) return false
  if (s.fill) return true
  return Math.min(Math.abs(x - b.x), Math.abs(x - b.x - b.w), Math.abs(y - b.y), Math.abs(y - b.y - b.h)) <= r + s.width
}

// ---- component --------------------------------------------------------------

export function CanvasView({
  note,
  notes,
  onChange,
  onOpenNote,
}: {
  note: Note
  notes: Note[]
  onChange: (body: string) => void
  onOpenNote: (id: string) => void
}) {
  const [data, setData] = useState<CanvasData>(() => parseCanvas(note.body))
  const [vp, setVp] = useState<Vp>(() => parseCanvas(note.body).viewport ?? { x: 80, y: 80, zoom: 1 })
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState(INK[0])
  const [width, setWidth] = useState(3)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>(null)
  const [edgeLabel, setEdgeLabel] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [space, setSpace] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const past = useRef<CanvasData[]>([])
  const future = useRef<CanvasData[]>([])
  const lastSaved = useRef(note.body)
  const live = useRef({ data, vp })
  live.current = { data, vp }
  const dragRef = useRef(drag)
  dragRef.current = drag

  // A different canvas, or an outside edit (another tab) — reload.
  useEffect(() => {
    if (note.body === lastSaved.current) return
    const next = parseCanvas(note.body)
    lastSaved.current = note.body
    setData(next)
    if (next.viewport) setVp(next.viewport)
    past.current = []
    future.current = []
    setSelected(new Set())
    setEditing(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, note.body])

  // Debounced save (includes the viewport so the canvas reopens where you left it).
  useEffect(() => {
    const t = window.setTimeout(() => {
      const body = JSON.stringify({ ...data, viewport: vp })
      if (body === lastSaved.current) return
      lastSaved.current = body
      onChange(body)
    }, 300)
    return () => window.clearTimeout(t)
  }, [data, vp, onChange])

  /** Commit a change as one undo step. */
  const commit = useCallback((next: CanvasData, before: CanvasData = live.current.data) => {
    past.current.push(before)
    if (past.current.length > 100) past.current.shift()
    future.current = []
    setData(next)
  }, [])
  const update = (fn: (d: CanvasData) => CanvasData) => commit(fn(live.current.data))

  const undo = () => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(live.current.data)
    setData(prev)
    setSelected(new Set())
  }
  const redo = () => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(live.current.data)
    setData(next)
  }

  const toWorld = (cx: number, cy: number): [number, number] => {
    const r = box.current!.getBoundingClientRect()
    const { vp } = live.current
    return [(cx - r.left - vp.x) / vp.zoom, (cy - r.top - vp.y) / vp.zoom]
  }

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes])
  const noteById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes])

  // ---- adding things ----------------------------------------------------

  const addNode = (n: Omit<CanvasNode, 'id'>, edit = false) => {
    const node = { ...n, id: uid('n') }
    update((d) => ({ ...d, nodes: n.type === 'group' ? [node, ...d.nodes] : [...d.nodes, node] }))
    setSelected(new Set([node.id]))
    if (edit) setEditing(node.id)
    return node.id
  }

  const addImage = async (blob: Blob, x: number, y: number) => {
    const [src, size] = await Promise.all([putImage(blob), imageSize(blob)])
    const scale = Math.min(1, 420 / size.w)
    addNode({ type: 'image', x, y, width: Math.round(size.w * scale), height: Math.round(size.h * scale), src })
  }

  const center = (): [number, number] => {
    const r = box.current!.getBoundingClientRect()
    return toWorld(r.left + r.width / 2, r.top + r.height / 2)
  }

  // ---- selection helpers ------------------------------------------------

  const deleteSelected = () => {
    if (!selected.size) return
    update((d) => ({
      nodes: d.nodes.filter((n) => !selected.has(n.id)),
      edges: d.edges.filter((e) => !selected.has(e.id) && !selected.has(e.fromNode) && !selected.has(e.toNode)),
      strokes: d.strokes.filter((s) => !selected.has(s.id)),
      shapes: d.shapes.filter((s) => !selected.has(s.id)),
      viewport: d.viewport,
    }))
    setSelected(new Set())
  }

  const duplicateSelected = () => {
    const map = new Map<string, string>()
    const d = live.current.data
    const nodes = d.nodes.filter((n) => selected.has(n.id)).map((n) => {
      const id = uid('n')
      map.set(n.id, id)
      return { ...n, id, x: n.x + 30, y: n.y + 30 }
    })
    const strokes = d.strokes.filter((s) => selected.has(s.id)).map((s) => ({ ...s, id: uid('s'), points: s.points.map((p) => p + 30) }))
    const shapes = d.shapes
      .filter((s) => selected.has(s.id))
      .map((s) => ({ ...s, id: uid('sh'), x1: s.x1 + 30, y1: s.y1 + 30, x2: s.x2 + 30, y2: s.y2 + 30 }))
    const edges = d.edges
      .filter((e) => map.has(e.fromNode) && map.has(e.toNode))
      .map((e) => ({ ...e, id: uid('e'), fromNode: map.get(e.fromNode)!, toNode: map.get(e.toNode)! }))
    update((x) => ({ ...x, nodes: [...x.nodes, ...nodes], strokes: [...x.strokes, ...strokes], shapes: [...x.shapes, ...shapes], edges: [...x.edges, ...edges] }))
    setSelected(new Set([...nodes, ...strokes, ...shapes].map((x) => x.id)))
  }

  const recolor = (c: string | undefined, ids = selected) =>
    update((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (ids.has(n.id) ? { ...n, color: c } : n)),
      edges: d.edges.map((e) => (ids.has(e.id) ? { ...e, color: c } : e)),
      strokes: d.strokes.map((s) => (ids.has(s.id) && c ? { ...s, color: nodeColor(c) ?? c } : s)),
      shapes: d.shapes.map((s) => (ids.has(s.id) && c ? { ...s, color: nodeColor(c) ?? c } : s)),
    }))

  const fit = () => {
    const d = live.current.data
    const boxes = [...d.nodes.map(nodeBox), ...d.strokes.map(strokeBox), ...d.shapes.map(shapeBox)]
    const r = box.current!.getBoundingClientRect()
    if (!boxes.length) return setVp({ x: r.width / 2, y: r.height / 2, zoom: 1 })
    const x1 = Math.min(...boxes.map((b) => b.x))
    const y1 = Math.min(...boxes.map((b) => b.y))
    const x2 = Math.max(...boxes.map((b) => b.x + b.w))
    const y2 = Math.max(...boxes.map((b) => b.y + b.h))
    const zoom = Math.max(0.1, Math.min(1.5, Math.min((r.width - 120) / (x2 - x1 || 1), (r.height - 160) / (y2 - y1 || 1))))
    setVp({ zoom, x: (r.width - (x2 - x1) * zoom) / 2 - x1 * zoom, y: (r.height - (y2 - y1) * zoom) / 2 - y1 * zoom })
  }

  const zoomBy = (factor: number, cx?: number, cy?: number) => {
    const r = box.current!.getBoundingClientRect()
    const px = cx ?? r.left + r.width / 2
    const py = cy ?? r.top + r.height / 2
    setVp((v) => {
      const zoom = Math.max(0.1, Math.min(4, v.zoom * factor))
      const wx = (px - r.left - v.x) / v.zoom
      const wy = (py - r.top - v.y) / v.zoom
      return { zoom, x: px - r.left - wx * zoom, y: py - r.top - wy * zoom }
    })
  }

  // Wheel: pan; Ctrl/Cmd (and trackpad pinch) zooms at the cursor.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const zoom = e.ctrlKey || e.metaKey
      // A plain wheel over a card whose text overflows scrolls that text.
      const inner = (e.target as HTMLElement).closest<HTMLElement>('.canvas-scroll')
      if (!zoom && inner && inner.scrollHeight > inner.clientHeight) return
      e.preventDefault()
      if (zoom) zoomBy(Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY)
      else setVp((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- pointer interactions ---------------------------------------------

  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const [x, y] = toWorld(e.clientX, e.clientY)
      setDrag((dr) => {
        if (!dr) return dr
        switch (dr.kind) {
          case 'pan':
            setVp((v) => ({ ...v, x: dr.vx + e.clientX - dr.sx, y: dr.vy + e.clientY - dr.sy }))
            return dr
          case 'move': {
            const dx = x - dr.sx
            const dy = y - dr.sy
            const b = dr.before
            // Moving a group carries the cards inside it.
            const ids = new Set(selected)
            for (const g of b.nodes) {
              if (g.type !== 'group' || !ids.has(g.id)) continue
              for (const n of b.nodes) if (n.id !== g.id && inside(nodeBox(n), nodeBox(g))) ids.add(n.id)
            }
            setData({
              ...b,
              nodes: b.nodes.map((n) => (ids.has(n.id) ? { ...n, x: Math.round(n.x + dx), y: Math.round(n.y + dy) } : n)),
              strokes: b.strokes.map((s) => (ids.has(s.id) ? { ...s, points: s.points.map((p, i) => p + (i % 2 ? dy : dx)) } : s)),
              shapes: b.shapes.map((s) => (ids.has(s.id) ? { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy } : s)),
            })
            return { ...dr, moved: dr.moved || Math.abs(dx) + Math.abs(dy) > 2 }
          }
          case 'resize':
            setData({
              ...dr.before,
              nodes: dr.before.nodes.map((n) =>
                n.id === dr.id ? { ...n, width: Math.max(80, Math.round(dr.w + x - dr.sx)), height: Math.max(40, Math.round(dr.h + y - dr.sy)) } : n,
              ),
            })
            return dr
          case 'shape-end':
            setData({
              ...dr.before,
              shapes: dr.before.shapes.map((s) => (s.id !== dr.id ? s : dr.end === 1 ? { ...s, x1: x, y1: y } : { ...s, x2: x, y2: y })),
            })
            return dr
          case 'edge':
            return { ...dr, x, y }
          case 'marquee':
            return { ...dr, x, y }
          case 'draw': {
            const p = dr.stroke.points
            const min = 1.5 / live.current.vp.zoom
            if (Math.hypot(x - p[p.length - 2], y - p[p.length - 1]) < min) return dr
            return { ...dr, stroke: { ...dr.stroke, points: [...p, Math.round(x * 10) / 10, Math.round(y * 10) / 10] } }
          }
          case 'shape':
            return { ...dr, shape: { ...dr.shape, x2: x, y2: y } }
          case 'erase': {
            const r = 8 / live.current.vp.zoom
            const d = live.current.data
            const strokes = d.strokes.filter((s) => !hitsStroke(s, x, y, r))
            const shapes = d.shapes.filter((s) => !hitsShape(s, x, y, r))
            if (strokes.length === d.strokes.length && shapes.length === d.shapes.length) return dr
            setData({ ...d, strokes, shapes })
            return { ...dr, erased: true }
          }
        }
      })
    }
    const onUp = (e: PointerEvent) => {
      const dr = dragRef.current
      setDrag(null)
      if (!dr) return
      const [x, y] = toWorld(e.clientX, e.clientY)
      switch (dr.kind) {
        case 'move':
          if (dr.moved) commit(live.current.data, dr.before)
          break
        case 'resize':
        case 'shape-end':
          commit(live.current.data, dr.before)
          break
        case 'erase':
          if (dr.erased) commit(live.current.data, dr.before)
          break
        case 'draw':
          update((d) => ({ ...d, strokes: [...d.strokes, dr.stroke] }))
          break
        case 'shape': {
          const s = dr.shape
          if (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 4) {
            update((d) => ({ ...d, shapes: [...d.shapes, s] }))
            setTool('select')
            setSelected(new Set([s.id]))
          }
          break
        }
        case 'edge': {
          const target = [...live.current.data.nodes]
            .reverse()
            .find((n) => n.id !== dr.from && x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height)
          if (target) {
            const from = nodeById.get(dr.from)!
            const toSide = bestSides(from, target)[1]
            update((d) => ({ ...d, edges: [...d.edges, { id: uid('e'), fromNode: dr.from, fromSide: dr.side, toNode: target.id, toSide }] }))
          }
          break
        }
        case 'marquee': {
          const m = { x: Math.min(dr.sx, dr.x), y: Math.min(dr.sy, dr.y), w: Math.abs(dr.x - dr.sx), h: Math.abs(dr.y - dr.sy) }
          if (m.w < 3 && m.h < 3) break
          const d = live.current.data
          const ids = [
            ...d.nodes.filter((n) => (n.type === 'group' ? inside(nodeBox(n), m) : overlaps(nodeBox(n), m))).map((n) => n.id),
            ...d.strokes.filter((s) => overlaps(strokeBox(s), m)).map((s) => s.id),
            ...d.shapes.filter((s) => overlaps(shapeBox(s), m)).map((s) => s.id),
          ]
          setSelected((cur) => new Set([...(dr.additive ? cur : []), ...ids]))
          break
        }
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.kind])

  const onPointerDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('textarea, input, .canvas-ui, a, button')) return
    box.current?.focus({ preventScroll: true })
    const [x, y] = toWorld(e.clientX, e.clientY)
    if (e.button === 1 || tool === 'hand' || space) {
      e.preventDefault()
      setDrag({ kind: 'pan', sx: e.clientX, sy: e.clientY, vx: vp.x, vy: vp.y })
      return
    }
    if (e.button !== 0) return
    if (tool === 'pen' || tool === 'highlighter') {
      const hl = tool === 'highlighter'
      setDrag({ kind: 'draw', stroke: { id: uid('s'), tool, color, width: hl ? width * 4 + 6 : width, points: [x, y] } })
      return
    }
    if (tool === 'eraser') {
      setDrag({ kind: 'erase', before: data, erased: false })
      return
    }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'arrow') {
      setDrag({ kind: 'shape', shape: { id: uid('sh'), type: tool, x1: x, y1: y, x2: x, y2: y, color, width } })
      return
    }
    if (tool === 'text') {
      addNode({ type: 'text', x: x - 20, y: y - 20, width: 260, height: 120, text: '' }, true)
      setTool('select')
      return
    }

    // Select tool.
    const handle = t.closest<HTMLElement>('[data-resize]')
    if (handle) {
      const n = nodeById.get(handle.dataset.resize!)!
      setDrag({ kind: 'resize', id: n.id, sx: x, sy: y, w: n.width, h: n.height, before: data })
      return
    }
    const endHandle = t.closest<SVGElement>('[data-shape-end]')
    if (endHandle) {
      const [id, end] = endHandle.dataset.shapeEnd!.split(':')
      setDrag({ kind: 'shape-end', id, end: end === '1' ? 1 : 2, before: data })
      return
    }
    const dot = t.closest<HTMLElement>('[data-dot]')
    if (dot) {
      const [id, side] = dot.dataset.dot!.split(':')
      setDrag({ kind: 'edge', from: id, side: side as Side, x, y })
      return
    }
    const hit = t.closest<HTMLElement | SVGElement>('[data-id]')
    if (hit) {
      const id = hit.dataset.id!
      if (editing === id) return
      const additive = e.shiftKey || e.metaKey || e.ctrlKey
      const next = additive ? new Set(selected) : selected.has(id) ? new Set(selected) : new Set<string>()
      if (additive && next.has(id)) next.delete(id)
      else next.add(id)
      setSelected(next)
      if (editing) setEditing(null)
      if (!id.startsWith('e')) setDrag({ kind: 'move', sx: x, sy: y, before: data, moved: false })
      return
    }
    setEditing(null)
    if (!e.shiftKey) setSelected(new Set())
    setDrag({ kind: 'marquee', sx: x, sy: y, x, y, additive: e.shiftKey })
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('textarea, input, .canvas-ui')) return
    const hit = t.closest<HTMLElement | SVGElement>('[data-id]')
    if (hit) {
      const id = hit.dataset.id!
      const n = nodeById.get(id)
      if (n?.type === 'text' || n?.type === 'group') setEditing(id)
      else if (n?.type === 'file' && n.noteId) onOpenNote(n.noteId)
      else if (n?.type === 'link' && n.url) window.open(n.url, '_blank', 'noopener,noreferrer')
      else if (id.startsWith('e')) setEdgeLabel(id)
      return
    }
    if (tool !== 'select') return
    const [x, y] = toWorld(e.clientX, e.clientY)
    addNode({ type: 'text', x: x - 130, y: y - 50, width: 260, height: 120, text: '' }, true)
  }

  // ---- keyboard, paste, drop ---------------------------------------------

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('textarea, input')) return
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      return e.shiftKey ? redo() : undo()
    }
    if (mod && e.key.toLowerCase() === 'y') return redo()
    if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      return duplicateSelected()
    }
    if (mod && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      return setSelected(new Set([...data.nodes, ...data.strokes, ...data.shapes].map((x) => x.id)))
    }
    if (e.key === 'Delete' || e.key === 'Backspace') return deleteSelected()
    if (e.key === 'Escape') {
      setSelected(new Set())
      return setTool('select')
    }
    if (e.key === ' ') {
      e.preventDefault()
      return setSpace(true)
    }
    if (mod) return
    const keys: Record<string, Tool> = { v: 'select', h: 'hand', t: 'text', p: 'pen', m: 'highlighter', e: 'eraser', r: 'rect', o: 'ellipse', a: 'arrow' }
    const next = keys[e.key.toLowerCase()]
    if (next) setTool(next)
    if (e.key === 'Enter' && selected.size === 1) {
      const id = [...selected][0]
      if (nodeById.get(id)?.type === 'text') {
        e.preventDefault()
        setEditing(id)
      }
    }
  }

  const onPaste = (e: React.ClipboardEvent) => {
    if ((e.target as HTMLElement).closest('textarea, input')) return
    const [x, y] = center()
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'))
    if (file) {
      e.preventDefault()
      void addImage(file, x - 150, y - 100)
      return
    }
    const text = e.clipboardData.getData('text/plain').trim()
    if (!text) return
    e.preventDefault()
    if (/^https?:\/\/\S+$/.test(text)) addNode({ type: 'link', x: x - 130, y: y - 45, width: 260, height: 90, url: text })
    else addNode({ type: 'text', x: x - 130, y: y - 60, width: 260, height: 120, text })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const [x, y] = toWorld(e.clientX, e.clientY)
    const noteId = e.dataTransfer.getData(NOTE_MIME)
    if (noteId) {
      addNode({ type: 'file', x: x - 150, y: y - 100, width: 300, height: 220, noteId })
      return
    }
    const imgs = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))
    if (imgs.length) {
      imgs.forEach((f, i) => void addImage(f, x + i * 30, y + i * 30))
      return
    }
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (/^https?:\/\/\S+$/.test(url.trim())) addNode({ type: 'link', x, y, width: 260, height: 90, url: url.trim() })
    else if (url.trim()) addNode({ type: 'text', x, y, width: 260, height: 120, text: url.trim() })
  }

  // ---- context menus -----------------------------------------------------

  const colorItems = (ids: Set<string>): MenuItem[] => [
    { label: 'No colour', onSelect: () => recolor(undefined, ids) },
    ...Object.entries(NODE_COLORS).map(([k, c]) => ({
      label: ['Red', 'Orange', 'Yellow', 'Green', 'Cyan', 'Purple'][Number(k) - 1],
      icon: <span className="block h-3 w-3 rounded-full" style={{ backgroundColor: c }} />,
      onSelect: () => recolor(k, ids),
    })),
  ]

  const onContextMenu = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('textarea, input')) return
    e.preventDefault()
    const [x, y] = toWorld(e.clientX, e.clientY)
    const hit = t.closest<HTMLElement | SVGElement>('[data-id]')
    if (!hit) {
      const recent = [...notes].filter((n) => n.kind !== 'canvas').sort((a, b) => a.title.localeCompare(b.title)).slice(0, 40)
      openContextMenu(e.clientX, e.clientY, [
        { label: 'Add card', icon: <StickyNote size={13} />, onSelect: () => addNode({ type: 'text', x, y, width: 260, height: 120, text: '' }, true) },
        {
          label: 'Add note',
          icon: <FileText size={13} />,
          submenu: recent.map((n) => ({ label: n.title, onSelect: () => addNode({ type: 'file', x, y, width: 300, height: 220, noteId: n.id }) })),
        },
        {
          label: 'Add web link',
          icon: <Globe size={13} />,
          onSelect: () => {
            const url = window.prompt('Link URL', 'https://')
            if (url && /^https?:\/\//.test(url)) addNode({ type: 'link', x, y, width: 260, height: 90, url })
          },
        },
        { label: 'Add group', icon: <Square size={13} />, onSelect: () => addNode({ type: 'group', x, y, width: 480, height: 320, label: 'Group' }) },
        { kind: 'separator' },
        { label: 'Zoom to fit', icon: <Maximize size={13} />, onSelect: fit },
        { label: 'Select all', onSelect: () => setSelected(new Set([...data.nodes, ...data.strokes, ...data.shapes].map((q) => q.id))) },
      ])
      return
    }
    const id = hit.dataset.id!
    const ids = selected.has(id) ? selected : new Set([id])
    if (!selected.has(id)) setSelected(ids)
    const n = nodeById.get(id)
    const edge = data.edges.find((x) => x.id === id)
    const items: MenuItem[] = []
    if (n?.type === 'text' || n?.type === 'group') items.push({ label: n.type === 'group' ? 'Rename group' : 'Edit', onSelect: () => setEditing(id) })
    if (n?.type === 'file' && n.noteId) items.push({ label: 'Open note', icon: <FileText size={13} />, onSelect: () => onOpenNote(n.noteId!) })
    if (n?.type === 'link' && n.url) items.push({ label: 'Open link', icon: <ExternalLink size={13} />, onSelect: () => window.open(n.url, '_blank', 'noopener,noreferrer') })
    if (edge) {
      items.push({ label: 'Edit label', onSelect: () => setEdgeLabel(id) })
      items.push({
        label: 'Reverse direction',
        onSelect: () =>
          update((d) => ({
            ...d,
            edges: d.edges.map((x) => (x.id === id ? { ...x, fromNode: x.toNode, toNode: x.fromNode, fromSide: x.toSide, toSide: x.fromSide } : x)),
          })),
      })
    }
    items.push({ label: 'Colour', submenu: colorItems(ids) })
    if (n) {
      items.push({ label: 'Bring to front', onSelect: () => update((d) => ({ ...d, nodes: [...d.nodes.filter((q) => !ids.has(q.id)), ...d.nodes.filter((q) => ids.has(q.id))] })) })
      items.push({ label: 'Send to back', onSelect: () => update((d) => ({ ...d, nodes: [...d.nodes.filter((q) => ids.has(q.id)), ...d.nodes.filter((q) => !ids.has(q.id))] })) })
    }
    if (!edge) items.push({ label: 'Duplicate', hint: 'Ctrl+D', onSelect: duplicateSelected })
    items.push({ kind: 'separator' }, { label: 'Delete', danger: true, hint: 'Del', onSelect: () => (setSelected(ids), deleteSelectedIds(ids)) })
    openContextMenu(e.clientX, e.clientY, items)
  }

  const deleteSelectedIds = (ids: Set<string>) =>
    update((d) => ({
      ...d,
      nodes: d.nodes.filter((n) => !ids.has(n.id)),
      edges: d.edges.filter((x) => !ids.has(x.id) && !ids.has(x.fromNode) && !ids.has(x.toNode)),
      strokes: d.strokes.filter((s) => !ids.has(s.id)),
      shapes: d.shapes.filter((s) => !ids.has(s.id)),
    }))

  // ---- render ------------------------------------------------------------

  const markerColors = [
    ...new Set(['#c77591', '#6b7785', ...INK, ...Object.values(NODE_COLORS), ...data.edges.map((e) => nodeColor(e.color) ?? '#6b7785'), ...data.shapes.map((s) => s.color)]),
  ]
  const groups = data.nodes.filter((n) => n.type === 'group')
  const cards = data.nodes.filter((n) => n.type !== 'group')
  const cursor =
    drag?.kind === 'pan' ? 'grabbing' : tool === 'hand' || space ? 'grab' : tool === 'select' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair'
  const inkStyle = (s: { color: string }) => s.color

  const setNodeText = (id: string, text: string, key: 'text' | 'label' = 'text') =>
    update((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, [key]: text } : n)) }))

  return (
    <div
      ref={box}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onKeyUp={(e) => e.key === ' ' && setSpace(false)}
      onPaste={onPaste}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onContextMenu={onContextMenu}
      className="relative h-full touch-none select-none overflow-hidden outline-none"
      style={{
        cursor,
        backgroundColor: '#0c0d10',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: `${22 * vp.zoom}px ${22 * vp.zoom}px`,
        backgroundPosition: `${vp.x}px ${vp.y}px`,
      }}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` }}>
        {groups.map((n) => (
          <GroupNode
            key={n.id}
            node={n}
            selected={selected.has(n.id)}
            editing={editing === n.id}
            onLabel={(v) => {
              setEditing(null)
              if (v !== n.label) setNodeText(n.id, v, 'label')
            }}
          />
        ))}

        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
          <defs>
            {markerColors.map((c) => (
              <marker key={c} id={markerId(c)} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={c} />
              </marker>
            ))}
          </defs>
          {data.edges.map((e) => {
            const a = nodeById.get(e.fromNode)
            const b = nodeById.get(e.toNode)
            if (!a || !b) return null
            const { d, mx, my } = edgePath(a, b, e)
            const c = nodeColor(e.color) ?? '#6b7785'
            const sel = selected.has(e.id)
            return (
              <g key={e.id}>
                <path d={d} data-id={e.id} stroke="transparent" strokeWidth={14} fill="none" className="pointer-events-auto cursor-pointer" />
                <path d={d} stroke={sel ? '#c77591' : c} strokeWidth={sel ? 3 : 2} fill="none" markerEnd={`url(#${markerId(sel ? '#c77591' : c)})`} />
                {e.label && (
                  <text x={mx} y={my} data-id={e.id} textAnchor="middle" dominantBaseline="middle" className="pointer-events-auto cursor-pointer" fill="#c8d2dc" stroke="#0c0d10" strokeWidth={5} paintOrder="stroke" fontSize={13} fontFamily="Inter, sans-serif">
                    {e.label}
                  </text>
                )}
              </g>
            )
          })}
          {drag?.kind === 'edge' && nodeById.get(drag.from) && (
            <path
              d={`M${anchor(nodeById.get(drag.from)!, drag.side).join(',')} L${drag.x},${drag.y}`}
              stroke="#c77591"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="none"
              markerEnd={`url(#${markerId('#c77591')})`}
            />
          )}
        </svg>

        {cards.map((n) => (
          <CardNode
            key={n.id}
            node={n}
            note={n.noteId ? noteById.get(n.noteId) : undefined}
            selected={selected.has(n.id)}
            editing={editing === n.id}
            showDots={tool === 'select' && !drag}
            onText={(v) => {
              setEditing(null)
              if (v !== (n.text ?? '')) setNodeText(n.id, v)
            }}
            onOpenNote={onOpenNote}
          />
        ))}

        {/* Ink layer: strokes and shapes sit on top of cards so you can annotate them. */}
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
          {data.shapes.map((s) => (
            <ShapeEl key={s.id} s={s} selected={selected.has(s.id)} interactive={tool === 'select'} />
          ))}
          {data.strokes.map((s) => {
            const sel = selected.has(s.id)
            const b = sel ? strokeBox(s) : null
            return (
              <g key={s.id}>
                <path
                  d={strokePath(s.points)}
                  data-id={s.id}
                  stroke={inkStyle(s)}
                  strokeOpacity={s.tool === 'highlighter' ? 0.35 : 1}
                  strokeWidth={s.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  className={cn(tool === 'select' && 'pointer-events-auto cursor-move')}
                  style={{ pointerEvents: tool === 'select' ? 'stroke' : 'none' }}
                />
                {b && <rect x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} fill="none" stroke="#c77591" strokeDasharray="4 3" />}
              </g>
            )
          })}
          {drag?.kind === 'draw' && (
            <path
              d={strokePath(drag.stroke.points)}
              stroke={drag.stroke.color}
              strokeOpacity={drag.stroke.tool === 'highlighter' ? 0.35 : 1}
              strokeWidth={drag.stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
          {drag?.kind === 'shape' && <ShapeEl s={drag.shape} selected={false} interactive={false} />}
          {drag?.kind === 'marquee' && (
            <rect
              x={Math.min(drag.sx, drag.x)}
              y={Math.min(drag.sy, drag.y)}
              width={Math.abs(drag.x - drag.sx)}
              height={Math.abs(drag.y - drag.sy)}
              fill="rgba(199,117,145,0.08)"
              stroke="#c77591"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {edgeLabel &&
          (() => {
            const e = data.edges.find((x) => x.id === edgeLabel)
            const a = e && nodeById.get(e.fromNode)
            const b = e && nodeById.get(e.toNode)
            if (!e || !a || !b) return null
            const { mx, my } = edgePath(a, b, e)
            return (
              <input
                autoFocus
                defaultValue={e.label ?? ''}
                placeholder="Label"
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') ev.currentTarget.blur()
                  if (ev.key === 'Escape') setEdgeLabel(null)
                }}
                onBlur={(ev) => {
                  const label = ev.currentTarget.value.trim()
                  setEdgeLabel(null)
                  update((d) => ({ ...d, edges: d.edges.map((x) => (x.id === e.id ? { ...x, label: label || undefined } : x)) }))
                }}
                style={{ left: mx - 80, top: my - 14 }}
                className="absolute w-40 rounded border border-accent/60 bg-panel px-2 py-1 text-center font-read text-[13px] text-text outline-none"
              />
            )
          })()}
      </div>

      {/* Tools */}
      <div className="canvas-ui absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-panel border border-line-2 bg-panel/95 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur">
        {(
          [
            ['select', <MousePointer2 size={15} />, 'Select (V)'],
            ['hand', <Hand size={15} />, 'Pan (H or hold Space)'],
            ['text', <StickyNote size={15} />, 'Card (T), or double-click'],
            ['pen', <PenLine size={15} />, 'Pen (P)'],
            ['highlighter', <Highlighter size={15} />, 'Highlighter (M)'],
            ['eraser', <Eraser size={15} />, 'Eraser (E)'],
            ['rect', <Square size={15} />, 'Rectangle (R)'],
            ['ellipse', <Circle size={15} />, 'Ellipse (O)'],
            ['arrow', <ArrowUpRight size={15} />, 'Arrow (A)'],
          ] as [Tool, ReactNode, string][]
        ).map(([t, icon, title]) => (
          <button
            key={t}
            title={title}
            aria-label={title}
            onClick={() => setTool(t)}
            className={cn('rounded-control p-1.5 transition-colors', tool === t ? 'bg-accent/20 text-accent-1' : 'text-dim hover:bg-panel-2 hover:text-text')}
          >
            {icon}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-line-2" />
        {INK.map((c) => (
          <button
            key={c}
            title="Ink colour"
            onClick={() => {
              setColor(c)
              const ink = new Set([...selected].filter((id) => data.strokes.some((s) => s.id === id) || data.shapes.some((s) => s.id === id)))
              if (ink.size) update((d) => ({ ...d, strokes: d.strokes.map((s) => (ink.has(s.id) ? { ...s, color: c } : s)), shapes: d.shapes.map((s) => (ink.has(s.id) ? { ...s, color: c } : s)) }))
            }}
            className={cn('m-0.5 h-4 w-4 rounded-full ring-offset-2 ring-offset-panel', color === c && 'ring-2 ring-accent')}
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-line-2" />
        {[2, 4, 8].map((w) => (
          <button
            key={w}
            title={`Stroke width ${w}`}
            onClick={() => setWidth(w)}
            className={cn('flex h-7 w-7 items-center justify-center rounded-control', width === w ? 'bg-accent/20' : 'hover:bg-panel-2')}
          >
            <span className="block rounded-full bg-text" style={{ width: w + 2, height: w + 2 }} />
          </button>
        ))}
      </div>

      <div className="canvas-ui absolute bottom-4 right-4 flex items-center gap-0.5 rounded-panel border border-line-2 bg-panel/95 p-1 font-read text-[11px] text-dim shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
        <button title="Undo (Ctrl+Z)" onClick={undo} className="rounded-control p-1.5 hover:bg-panel-2 hover:text-text">
          <Undo2 size={14} />
        </button>
        <button title="Redo (Ctrl+Shift+Z)" onClick={redo} className="rounded-control p-1.5 hover:bg-panel-2 hover:text-text">
          <Redo2 size={14} />
        </button>
        <span className="mx-0.5 h-5 w-px bg-line-2" />
        <button title="Zoom out" onClick={() => zoomBy(1 / 1.2)} className="rounded-control p-1.5 hover:bg-panel-2 hover:text-text">
          <Minus size={14} />
        </button>
        <button title="Reset zoom" onClick={() => zoomBy(1 / vp.zoom)} className="w-11 rounded-control py-1 text-center hover:bg-panel-2 hover:text-text">
          {Math.round(vp.zoom * 100)}%
        </button>
        <button title="Zoom in" onClick={() => zoomBy(1.2)} className="rounded-control p-1.5 hover:bg-panel-2 hover:text-text">
          <Plus size={14} />
        </button>
        <button title="Zoom to fit" onClick={fit} className="rounded-control p-1.5 hover:bg-panel-2 hover:text-text">
          <Maximize size={14} />
        </button>
      </div>

      {!data.nodes.length && !data.strokes.length && !data.shapes.length && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-read text-[13px] text-dim">
          Double-click to add a card · drag notes in from the explorer · paste images · press P to draw
        </div>
      )}
    </div>
  )
}

// ---- nodes ------------------------------------------------------------------

function ShapeEl({ s, selected, interactive }: { s: Shape; selected: boolean; interactive: boolean }) {
  const b = shapeBox(s)
  const common = {
    'data-id': s.id,
    stroke: s.color,
    strokeWidth: s.width,
    fill: s.fill ? `${s.color}33` : 'none',
    style: {
      pointerEvents: interactive ? (s.fill ? ('visiblePainted' as const) : ('stroke' as const)) : ('none' as const),
      cursor: interactive ? 'move' : undefined,
    },
  }
  return (
    <g>
      {s.type === 'rect' && <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} {...common} />}
      {s.type === 'ellipse' && <ellipse cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} {...common} />}
      {(s.type === 'arrow' || s.type === 'line') && (
        <>
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="transparent" strokeWidth={14} data-id={s.id} style={common.style} />
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth={s.width} strokeLinecap="round" markerEnd={s.type === 'arrow' ? `url(#${markerId(s.color)})` : undefined} pointerEvents="none" />
        </>
      )}
      {selected && (
        <>
          <rect x={b.x - 5} y={b.y - 5} width={b.w + 10} height={b.h + 10} fill="none" stroke="#c77591" strokeDasharray="4 3" pointerEvents="none" />
          {[1, 2].map((end) => (
            <circle
              key={end}
              data-shape-end={`${s.id}:${end}`}
              cx={end === 1 ? s.x1 : s.x2}
              cy={end === 1 ? s.y1 : s.y2}
              r={5}
              fill="#c77591"
              stroke="#0c0d10"
              strokeWidth={2}
              style={{ pointerEvents: 'all', cursor: 'nwse-resize' }}
            />
          ))}
        </>
      )}
    </g>
  )
}

function GroupNode({ node, selected, editing, onLabel }: { node: CanvasNode; selected: boolean; editing: boolean; onLabel: (v: string) => void }) {
  const c = nodeColor(node.color) ?? '#6b7785'
  return (
    <div
      data-id={node.id}
      className={cn('absolute rounded-xl border-2', selected && 'ring-2 ring-accent')}
      style={{ left: node.x, top: node.y, width: node.width, height: node.height, borderColor: `${c}88`, backgroundColor: `${c}10` }}
    >
      <div className="absolute -top-8 left-0 font-read text-[15px] font-semibold" style={{ color: c }}>
        {editing ? (
          <input
            autoFocus
            defaultValue={node.label ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
            }}
            onBlur={(e) => onLabel(e.currentTarget.value)}
            className="rounded border border-accent/60 bg-panel px-1.5 text-text outline-none"
          />
        ) : (
          node.label || 'Group'
        )}
      </div>
      {selected && <div data-resize={node.id} className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-bg bg-accent" />}
    </div>
  )
}

function ImageFill({ src }: { src: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void imageUrl(src).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [src])
  return url ? (
    <img src={url} alt="" draggable={false} className="h-full w-full rounded-[inherit] object-contain" />
  ) : (
    <div className="flex h-full items-center justify-center text-[12px] text-dim">Image unavailable</div>
  )
}

function CardNode({
  node,
  note,
  selected,
  editing,
  showDots,
  onText,
  onOpenNote,
}: {
  node: CanvasNode
  note?: Note
  selected: boolean
  editing: boolean
  showDots: boolean
  onText: (v: string) => void
  onOpenNote: (id: string) => void
}) {
  const c = nodeColor(node.color)
  let host = ''
  try {
    host = node.url ? new URL(node.url).hostname : ''
  } catch {
    host = node.url ?? ''
  }
  return (
    <div
      data-id={node.id}
      className={cn(
        'group/card absolute rounded-lg border bg-panel font-read shadow-[0_4px_16px_rgba(0,0,0,0.35)]',
        selected ? 'ring-2 ring-accent' : 'hover:border-line-2',
        node.type === 'image' && 'bg-transparent shadow-none',
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        borderColor: c ?? '#26272a',
        backgroundColor: c && node.type !== 'image' ? `color-mix(in srgb, ${c} 10%, #141518)` : undefined,
      }}
    >
      {node.type === 'text' &&
        (editing ? (
          <textarea
            autoFocus
            defaultValue={node.text ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.currentTarget.blur()
            }}
            onBlur={(e) => onText(e.currentTarget.value)}
            placeholder="Type markdown…"
            className="h-full w-full resize-none rounded-lg bg-bg/60 p-3 text-[13px] leading-relaxed text-text outline-none"
          />
        ) : (
          <div className="canvas-scroll prose-term prose-read h-full overflow-auto px-4 py-2 !text-[13px] !leading-relaxed">
            {node.text ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.text}</ReactMarkdown> : <p className="text-dim">Double-click to edit</p>}
          </div>
        ))}
      {node.type === 'file' && (
        <div className="flex h-full flex-col overflow-hidden">
          <button
            onClick={() => note && onOpenNote(note.id)}
            className="flex shrink-0 items-center gap-1.5 border-b border-line px-3 py-1.5 text-left text-[12px] font-semibold text-text hover:text-accent-1"
          >
            <FileText size={12} className="shrink-0 text-dim" />
            <span className="truncate">{note?.title ?? 'Missing note'}</span>
          </button>
          <div className="canvas-scroll prose-term prose-read min-h-0 flex-1 overflow-auto px-3 py-1 !text-[12px] !leading-relaxed">
            {note && <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentOf(note.body).slice(0, 4000)}</ReactMarkdown>}
          </div>
        </div>
      )}
      {node.type === 'link' && (
        <div className="flex h-full flex-col justify-center gap-1 overflow-hidden px-3">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
            <Globe size={13} className="shrink-0 text-violet-2" />
            <span className="truncate">{host}</span>
          </div>
          <a href={node.url} target="_blank" rel="noopener noreferrer" className="truncate text-[11px] text-violet-2 underline decoration-violet-2/40">
            {node.url}
          </a>
        </div>
      )}
      {node.type === 'image' && node.src && <ImageFill src={node.src} />}

      {showDots &&
        (['top', 'right', 'bottom', 'left'] as Side[]).map((side) => (
          <div
            key={side}
            data-dot={`${node.id}:${side}`}
            title="Drag to connect"
            className={cn(
              'absolute h-3 w-3 cursor-crosshair rounded-full border-2 border-bg bg-accent opacity-0 transition-opacity group-hover/card:opacity-100',
              side === 'top' && '-top-1.5 left-1/2 -translate-x-1/2',
              side === 'bottom' && '-bottom-1.5 left-1/2 -translate-x-1/2',
              side === 'left' && '-left-1.5 top-1/2 -translate-y-1/2',
              side === 'right' && '-right-1.5 top-1/2 -translate-y-1/2',
            )}
          />
        ))}
      {selected && <div data-resize={node.id} className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-bg bg-accent" />}
    </div>
  )
}
