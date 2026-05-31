import { useEffect, useMemo, useState } from 'react'
import { Database, X } from 'lucide-react'
import { LIBRARY, PLAYABLE_BEATS, isAudio, toBeat, type Asset, type AssetCategory } from '@/data/library'
import { useBeatPlayer } from '@/features/beatstore/useBeatPlayer'
import { SearchInput } from '@/components/ui/SearchInput'
import { Modal } from '@/components/ui/Modal'
import { useIsDesktop } from '@/lib/useMediaQuery'
import { cn } from '@/lib/cn'
import { CATEGORIES, ALL_ICON, categoryMeta } from './categories'
import { CategoryRail } from './CategoryRail'
import { AssetList } from './AssetList'
import { DetailPanel } from './DetailPanel'
import { Transport } from './Transport'

interface BeatDBPageProps {
  open: boolean
  onClose: () => void
}

function matchesQuery(a: Asset, q: string): boolean {
  if (!q) return true
  const hay = `${a.title} ${a.artist} ${a.tags.join(' ')} ${a.fileType} ${a.musicalKey ?? ''} ${a.category}`.toLowerCase()
  return hay.includes(q)
}

/**
 * Beat DB — the private artist library. A full standalone app surfaced as a
 * Lab node: category rail · searchable list · file preview panel · docked
 * player. Audio-first, but every asset type (lyrics, artwork, video, stems,
 * notes) has a preview.
 */
export function BeatDBPage({ open, onClose }: BeatDBPageProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<AssetCategory | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string>(LIBRARY[0].id)
  const [mobileDetail, setMobileDetail] = useState(false)
  const isDesktop = useIsDesktop()
  const player = useBeatPlayer(PLAYABLE_BEATS)

  // Esc closes the app; pause audio when it unmounts via close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  useEffect(() => {
    if (!open) player.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const q = query.trim().toLowerCase()
  const bySearch = useMemo(() => LIBRARY.filter((a) => matchesQuery(a, q)), [q])
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const a of bySearch) c[a.category] = (c[a.category] ?? 0) + 1
    return c
  }, [bySearch])
  const filtered = useMemo(
    () => (category === 'all' ? bySearch : bySearch.filter((a) => a.category === category)),
    [bySearch, category],
  )

  const selected = LIBRARY.find((a) => a.id === selectedId) ?? filtered[0] ?? LIBRARY[0]
  const playingId = player.playing ? player.current?.id ?? null : null

  const select = (a: Asset) => {
    setSelectedId(a.id)
    if (!isDesktop) setMobileDetail(true)
  }
  const togglePlay = (a: Asset) => {
    if (isAudio(a)) player.toggle(toBeat(a))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg font-mono text-text">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel/70 px-3 backdrop-blur sm:px-4">
        <div className="flex shrink-0 items-center gap-2">
          <Database size={16} className="text-accent" />
          <span className="font-display text-sm tracking-wider text-text">BEAT DB</span>
          <span className="hidden text-[9px] uppercase tracking-[0.2em] text-dim sm:inline">Artist library</span>
        </div>
        <div className="ml-auto hidden flex-1 justify-center sm:flex">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="search beats, lyrics, artwork…"
            className="w-full max-w-sm"
          />
        </div>
        <span className="ml-auto shrink-0 text-[10px] tabular-nums text-dim sm:ml-0">
          {filtered.length} / {LIBRARY.length}
        </span>
        <button onClick={onClose} aria-label="Close Beat DB" className="shrink-0 text-dim transition-colors hover:text-text">
          <X size={18} />
        </button>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <CategoryRail active={category} counts={counts} total={bySearch.length} onSelect={setCategory} />

        {/* Main list column */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Mobile search + category chips */}
          <div className="border-b border-line p-2 lg:hidden">
            <SearchInput value={query} onChange={setQuery} placeholder="search library…" />
            <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5">
              <Chip
                icon={ALL_ICON}
                label="All"
                accent="#c8d2dc"
                active={category === 'all'}
                onClick={() => setCategory('all')}
              />
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  icon={c.icon}
                  label={c.label}
                  accent={c.accent}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                />
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <AssetList
              assets={filtered}
              selectedId={selected.id}
              playingId={playingId}
              query={query}
              onSelect={select}
              onTogglePlay={togglePlay}
            />
          </div>
        </section>

        {/* Desktop detail panel */}
        <aside className="hidden w-[400px] shrink-0 overflow-y-auto border-l border-line bg-panel/30 p-4 xl:w-[440px] lg:block">
          <DetailPanel asset={selected} player={player} onSelectRelated={(a) => setSelectedId(a.id)} />
        </aside>
      </div>

      <Transport player={player} />

      {/* Mobile detail modal */}
      <Modal
        open={mobileDetail && !isDesktop}
        onClose={() => setMobileDetail(false)}
        title={selected.title}
        code={categoryMeta(selected.category).label}
        accent={categoryMeta(selected.category).accent}
        width={560}
      >
        <DetailPanel
          asset={selected}
          player={player}
          onSelectRelated={(a) => setSelectedId(a.id)}
        />
      </Modal>
    </div>
  )
}

function Chip({
  icon: Icon,
  label,
  accent,
  active,
  onClick,
}: {
  icon: typeof ALL_ICON
  label: string
  accent: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 py-1 text-[11px] transition-colors',
        active ? 'text-text' : 'border-line text-dim hover:text-text',
      )}
      style={active ? { borderColor: accent, color: accent } : undefined}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}
