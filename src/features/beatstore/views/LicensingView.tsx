import { Disc3 } from 'lucide-react'

const TIERS = [
  {
    tier: 'MP3',
    price: 'from $24.99',
    desc: 'Tagless MP3 master. Stream up to 5,000 plays, monetise on YouTube and TikTok, credit "Prod. isark".',
    bullets: ['Tagless MP3 master', 'Up to 5k streams', 'Music videos OK', 'Credit Prod. isark'],
  },
  {
    tier: 'WAV',
    price: 'from $49.99',
    desc: 'Adds the uncompressed WAV master and lifts the stream cap to 10,000. Same usage rights as MP3.',
    bullets: ['Everything in MP3', 'Uncompressed WAV', 'Up to 10k streams', 'Mixing-ready file'],
  },
  {
    tier: 'Exclusive',
    price: 'from $279',
    desc: 'Full transfer of rights. The beat is removed from the catalog after purchase, and you get trackouts.',
    bullets: ['Full rights transfer', 'Track-outs & stems', 'Beat retired from store', 'No streaming caps'],
  },
]

export function LicensingView() {
  return (
    <div className="mx-auto h-full max-w-3xl space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="font-sans text-3xl font-bold tracking-tight text-isark-text">Licensing</h1>
        <p className="mt-2 max-w-prose text-sm text-isark-dim">
          Every beat ships under one of three license tiers. Pick the one that fits where the song will live; you can
          always upgrade later.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.tier}
            className="flex flex-col rounded-2xl border border-isark-line bg-isark-surface/70 p-4 backdrop-blur-sm"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-isark-accent">{t.tier}</span>
              <span className="text-sm text-isark-dim">{t.price}</span>
            </div>
            <p className="mt-2 text-sm text-isark-text">{t.desc}</p>
            <ul className="mt-3 space-y-1.5 text-[12px] text-isark-dim">
              {t.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Disc3 size={10} className="text-isark-accent" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-isark-dim">
        This is a demo storefront — checkout is mocked and no real payment is processed. License copy and prices are
        illustrative.
      </p>
    </div>
  )
}
