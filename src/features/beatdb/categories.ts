import {
  Music2,
  Mic2,
  FileText,
  Image as ImageIcon,
  Film,
  Smartphone,
  Layers,
  StickyNote,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react'
import type { AssetCategory } from '@/data/library'

export interface CategoryMeta {
  id: AssetCategory
  label: string
  /** Short noun used in counts, e.g. "12 beats". */
  plural: string
  icon: LucideIcon
  accent: string
}

/** Ordered for the rail. Audio-first, since beats are the priority. */
export const CATEGORIES: CategoryMeta[] = [
  { id: 'beat', label: 'Beats', plural: 'beats', icon: Music2, accent: '#36e0c8' },
  { id: 'song', label: 'Songs', plural: 'songs', icon: Mic2, accent: '#e0408a' },
  { id: 'lyrics', label: 'Lyrics', plural: 'lyric sheets', icon: FileText, accent: '#f0a020' },
  { id: 'artwork', label: 'Artwork', plural: 'images', icon: ImageIcon, accent: '#46d369' },
  { id: 'music-video', label: 'Music Videos', plural: 'videos', icon: Film, accent: '#6aa6ff' },
  { id: 'social-video', label: 'Social', plural: 'clips', icon: Smartphone, accent: '#b58cff' },
  { id: 'stem', label: 'Stems', plural: 'packs', icon: Layers, accent: '#5EE6F0' },
  { id: 'note', label: 'Notes', plural: 'notes', icon: StickyNote, accent: '#9aa7b3' },
]

export const ALL_ICON: LucideIcon = LayoutGrid

export function categoryMeta(id: AssetCategory): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id)!
}
