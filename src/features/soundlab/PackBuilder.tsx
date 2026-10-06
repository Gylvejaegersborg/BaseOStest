import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Package, Play, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { KINDS, buildPack, listKept, listPacks, packDownloadUrl, soundUrl, type Candidate, type PackSummary } from './soundlabClient'

interface Props {
  onClose: () => void
}

const RECOMMENDED = '10 to 20 sounds is a good first pack'

/** Pick from everything you've kept, name the pack, and get a zip a producer can open: 24-bit WAVs sorted by kind,
 *  a README, a draft license (with its [brackets]) and a manifest. Building is internal; selling it is not. */
export function PackBuilder({ onClose }: Props) {
  const [kept, setKept] = useState<Candidate[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [built, setBuilt] = useState<PackSummary | null>(null)
  const [earlier, setEarlier] = useState<PackSummary[]>([])
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    listKept().then((k) => {
      setKept(k)
      setPicked(new Set(k.map((c) => c.id)))
    }, (e) => setError(e instanceof Error ? e.message : String(e)))
    listPacks().then(setEarlier, () => {})
  }, [])

  const groups = useMemo(() => {
    const m = new Map<string, Candidate[]>()
    for (const c of kept ?? []) m.set(c.kind, [...(m.get(c.kind) ?? []), c])
    return KINDS.filter((k) => m.has(k.id)).map((k) => ({ kind: k, items: m.get(k.id)! }))
  }, [kept])

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const play = (id: string) => {
    const a = (audio.current ??= new Audio())
    a.src = soundUrl(id)
    void a.play().catch(() => {})
  }

  const build = async () => {
    if (busy) return
    if (!name.trim()) return setError('Give the pack a name.')
    if (!picked.size) return setError('Pick at least one sound.')
    setBusy(true)
    setError(null)
    try {
      const pack = await buildPack(name.trim(), [...picked])
      setBuilt(pack)
      setEarlier((e) => [pack, ...e])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const count = picked.size
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg px-4 pb-10 pt-4 font-mono text-text" role="dialog" aria-label="Build a pack">
      <div className="mx-auto max-w-xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-sm tracking-wider">
            <Package size={16} className="text-accent" /> BUILD A PACK
          </h2>
          <button onClick={onClose} aria-label="Close pack builder" className="text-dim hover:text-text">
            <X size={18} />
          </button>
        </header>

        {built ? (
          <div>
            <p className="font-display text-xl">{built.name}</p>
            <p className="mb-3 text-[11px] text-dim">
              {built.sounds.length} sounds · {(built.zipBytes / 1048576).toFixed(1)} MB · {Object.entries(built.counts).map(([k, n]) => `${k} ${n}`).join(' · ')}
            </p>
            <a
              href={packDownloadUrl(built.id)}
              download
              className="mb-3 inline-flex items-center gap-2 border border-accent/60 px-3 py-2 text-xs text-accent hover:bg-accent/10"
            >
              <Download size={14} /> Download the zip
            </a>
            <p className="text-[11px] leading-relaxed text-dim">
              The zip holds the sounds in folders by kind, a README, a manifest and a license that is still a <span className="text-text">draft</span>:
              fill in its [brackets] and have it reviewed before you sell anything. Nothing has been published.
            </p>
            <button onClick={() => setBuilt(null)} className="mt-4 text-[11px] text-dim hover:text-text">
              Build another
            </button>
          </div>
        ) : kept === null ? (
          <p className="text-xs text-dim">{error ?? 'Loading what you kept…'}</p>
        ) : kept.length === 0 ? (
          <p className="text-xs text-dim">Nothing kept yet. Keep some sounds first; only kept sounds go in a pack.</p>
        ) : (
          <>
            <label className="label mb-1 block">Pack name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. a name you'll sell it under"
              className="mb-1 w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
            />
            <p className="mb-4 text-[10px] text-dim">File and folder names use plain letters (a stylized Λ becomes A, which is what search needs).</p>

            <div className="mb-2 flex items-center justify-between text-[11px] text-dim">
              <span className={cn(count >= 10 && count <= 20 ? 'text-green-400' : '')}>
                {count} selected · {RECOMMENDED}
              </span>
              <span className="flex gap-3">
                <button onClick={() => setPicked(new Set(kept.map((c) => c.id)))} className="hover:text-text">All</button>
                <button onClick={() => setPicked(new Set())} className="hover:text-text">None</button>
              </span>
            </div>

            {groups.map(({ kind, items }) => (
              <section key={kind.id} className="mb-3">
                <h3 className="mb-1 text-[10px] uppercase tracking-wider text-dim">{kind.label} ({items.length})</h3>
                <ul className="divide-y divide-line border border-line">
                  {items.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                      <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Include ${c.label}`} className="size-3.5 accent-accent" />
                      <button onClick={() => play(c.id)} aria-label={`Play ${c.label}`} className="text-accent">
                        <Play size={13} />
                      </button>
                      <span className="flex-1">{c.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {error && <p role="alert" className="mb-2 text-[11px] text-red-400">{error}</p>}
            <button onClick={build} disabled={busy} className="border border-accent/60 px-4 py-2 text-xs text-accent hover:bg-accent/10 disabled:opacity-50">
              {busy ? 'Building…' : `Build pack (${count})`}
            </button>
          </>
        )}

        {earlier.length > 0 && (
          <section className="mt-8">
            <h3 className="mb-1 text-[10px] uppercase tracking-wider text-dim">Packs you've built</h3>
            <ul className="divide-y divide-line border border-line">
              {earlier.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <span className="flex-1">
                    {p.name} <span className="text-dim">· {p.sounds.length} sounds · {p.createdAt.slice(0, 10)}</span>
                  </span>
                  <a href={packDownloadUrl(p.id)} download aria-label={`Download ${p.name}`} className="text-accent hover:text-text">
                    <Download size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
