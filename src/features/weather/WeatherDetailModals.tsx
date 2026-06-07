import { format, parseISO } from 'date-fns'
import { Modal } from '@/components/ui/Modal'
import type { HourPoint, LocationWeather } from './types'
import type { MetricKey } from './CurrentHero'
import { SeriesChart, type SeriesPoint } from './SeriesChart'
import { EventRow, MoonGlyph } from './WeatherPanels'
import { moonInfo } from './astro'
import { PROVIDERS, STATUS_META } from './models'
import {
  AQI_META,
  AURORA_META,
  euroAqiBand,
  UV_META,
  uvBand,
  WEATHER_ACCENT,
  windArrowDir,
} from './format'

// ── Metric drill-down (wind / precip / humidity / pressure) ──────────────────
const METRIC_CFG: Record<
  MetricKey,
  { label: string; code: string; unit: string; kind: 'line' | 'bar'; color: string; zero?: boolean; pick: (h: HourPoint) => number; agg: 'max' | 'sum' | 'avg' }
> = {
  wind: { label: 'Wind', code: 'WIND', unit: ' m/s', kind: 'line', color: '#58b6f0', pick: (h) => h.windSpeed, agg: 'max' },
  precip: { label: 'Precipitation', code: 'PRECIP', unit: ' mm', kind: 'bar', color: '#58b6f0', zero: true, pick: (h) => h.precip, agg: 'sum' },
  humidity: { label: 'Humidity', code: 'HUM', unit: '%', kind: 'line', color: '#46d369', pick: (h) => h.humidity, agg: 'avg' },
  pressure: { label: 'Pressure', code: 'PRESS', unit: ' hPa', kind: 'line', color: '#f0a020', pick: (h) => h.pressure, agg: 'avg' },
}

function byDay(hours: HourPoint[], pick: (h: HourPoint) => number): Map<string, number[]> {
  const m = new Map<string, number[]>()
  for (const h of hours) {
    const k = h.time.slice(0, 10)
    const arr = m.get(k) ?? []
    arr.push(pick(h))
    m.set(k, arr)
  }
  return m
}

function aggregate(vals: number[], agg: 'max' | 'sum' | 'avg'): number {
  if (!vals.length) return 0
  if (agg === 'max') return Math.max(...vals)
  if (agg === 'sum') return vals.reduce((a, b) => a + b, 0)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function MetricDetailModal({ metric, wx, onClose }: { metric: MetricKey | null; wx: LocationWeather; onClose: () => void }) {
  if (!metric) return null
  const cfg = METRIC_CFG[metric]
  const points: SeriesPoint[] = wx.hours.map((h) => ({ time: h.time, value: cfg.pick(h) }))
  const days = [...byDay(wx.hours, cfg.pick)]

  return (
    <Modal open onClose={onClose} title={cfg.label} code={cfg.code} accent={cfg.color} width={620}>
      <SeriesChart points={points} color={cfg.color} kind={cfg.kind} unit={cfg.unit} zeroFloor={cfg.zero} />
      {metric === 'wind' && (
        <div className="mt-1 text-[11px] text-dim">
          Now {wx.current.windSpeed.toFixed(1)} m/s from {windArrowDir(wx.current.windDir)}
          {wx.current.windGust ? ` · gusts ${wx.current.windGust.toFixed(1)} m/s` : ''}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
        {days.map(([date, vals]) => (
          <div key={date} className="flex items-center justify-between border-b border-line/40 py-1 text-xs">
            <span className="text-dim">{format(parseISO(date), 'EEE d')}</span>
            <span className="tabular-nums text-text">
              {cfg.agg === 'avg' ? Math.round(aggregate(vals, 'avg')) : Math.round(aggregate(vals, cfg.agg) * 10) / 10}
              {cfg.unit}
              <span className="ml-1 text-[9px] text-dim">{cfg.agg}</span>
            </span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ── Astro (multi-day sun + moon) ─────────────────────────────────────────────
export function AstroDetailModal({ wx, onClose, open }: { wx: LocationWeather; onClose: () => void; open: boolean }) {
  if (!open) return null
  return (
    <Modal open onClose={onClose} title="Sun & Moon" code="ASTRO" accent="#f0c020" width={520}>
      <div className="divide-y divide-line/50">
        {wx.days.map((d) => {
          const sr = d.sunrise ? parseISO(d.sunrise) : null
          const ss = d.sunset ? parseISO(d.sunset) : null
          const daylight = sr && ss ? (ss.getTime() - sr.getTime()) / 3600000 : null
          const moon = moonInfo(parseISO(d.date))
          return (
            <div key={d.date} className="flex items-center gap-3 py-2 text-xs">
              <span className="w-16 text-dim">{format(parseISO(d.date), 'EEE d MMM')}</span>
              <span className="flex items-center gap-1 text-amber">↑ {sr ? format(sr, 'HH:mm') : '—'}</span>
              <span className="flex items-center gap-1 text-magenta">↓ {ss ? format(ss, 'HH:mm') : '—'}</span>
              <span className="text-dim">{daylight != null ? `${daylight.toFixed(1)}h` : '—'}</span>
              <span className="ml-auto flex items-center gap-1.5 text-text">
                <MoonGlyph illum={moon.illum} phase={moon.phase} />
                {moon.name}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[10px] text-dim">Sun times via Open-Meteo; moon phase computed locally.</p>
    </Modal>
  )
}

// ── Air quality (multi-day series) ───────────────────────────────────────────
export function AirDetailModal({ wx, onClose, open }: { wx: LocationWeather; onClose: () => void; open: boolean }) {
  if (!open) return null
  const meta = AQI_META[wx.airQuality.band]
  const points: SeriesPoint[] = wx.airQualitySeries.map((p) => ({ time: p.time, value: p.aqi }))
  return (
    <Modal open onClose={onClose} title="Air Quality" code="AQI" accent={meta.color} width={620}>
      <div className="mb-2 flex items-center gap-3">
        <span className="font-display text-2xl" style={{ color: meta.color }}>
          {wx.airQuality.aqi}
        </span>
        <span className="text-sm" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-[11px] text-dim">
          PM2.5 {wx.airQuality.pm25 ?? '—'} · PM10 {wx.airQuality.pm10 ?? '—'} · NO₂ {wx.airQuality.no2 ?? '—'} · O₃ {wx.airQuality.o3 ?? '—'}
        </span>
      </div>
      <SeriesChart points={points} color={meta.color} kind="line" unit="" zeroFloor />
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
        {wx.days
          .filter((d) => d.aqiMax != null)
          .map((d) => {
            const c = AQI_META[euroAqiBand(d.aqiMax!)]
            return (
              <div key={d.date} className="flex items-center justify-between border-b border-line/40 py-1 text-xs">
                <span className="text-dim">{format(parseISO(d.date), 'EEE d')}</span>
                <span className="tabular-nums" style={{ color: c.color }}>
                  {d.aqiMax} {c.label}
                </span>
              </div>
            )
          })}
      </div>
      <p className="mt-2 text-[10px] text-dim">European AQI · Open-Meteo Air Quality.</p>
    </Modal>
  )
}

// ── UV (multi-day) ───────────────────────────────────────────────────────────
export function UvDetailModal({ wx, onClose, open }: { wx: LocationWeather; onClose: () => void; open: boolean }) {
  if (!open) return null
  const nowUv = wx.uvHours[0]?.uv ?? 0
  const meta = UV_META[uvBand(nowUv)]
  const points: SeriesPoint[] = wx.uvHours.map((p) => ({ time: p.time, value: p.uv }))
  return (
    <Modal open onClose={onClose} title="UV Index" code="UV" accent={meta.color} width={620}>
      <SeriesChart points={points} color={meta.color} kind="bar" zeroFloor />
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
        {wx.days
          .filter((d) => d.uvMax != null)
          .map((d) => {
            const c = UV_META[uvBand(d.uvMax!)]
            return (
              <div key={d.date} className="flex items-center justify-between border-b border-line/40 py-1 text-xs">
                <span className="text-dim">{format(parseISO(d.date), 'EEE d')}</span>
                <span className="tabular-nums" style={{ color: c.color }}>
                  {Math.round(d.uvMax!)} {c.label}
                </span>
              </div>
            )
          })}
      </div>
      <p className="mt-2 text-[10px] text-dim">
        Protection advised from UV 3+. Snow at altitude (Trysil) reflects and raises effective UV.
      </p>
    </Modal>
  )
}

// ── Aurora ───────────────────────────────────────────────────────────────────
export function AuroraDetailModal({ wx, onClose, open }: { wx: LocationWeather; onClose: () => void; open: boolean }) {
  if (!open) return null
  const a = wx.aurora
  const meta = AURORA_META[a.band]
  const points: SeriesPoint[] = a.forecast.map((p) => ({ time: p.time.replace(' ', 'T'), value: p.kp }))
  return (
    <Modal open onClose={onClose} title="Northern Lights" code="AURORA" accent={meta.color} width={620}>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span style={{ color: meta.color }}>{meta.label}</span>
        <span className="text-dim">Kp now <span className="text-text">{a.kp}</span></span>
        <span className="text-dim">peak <span className="text-text">{a.kpMax.toFixed(1)}</span></span>
        <span className="text-dim">visibility <span style={{ color: meta.color }}>{a.probability}%</span></span>
      </div>
      {points.length > 1 && <SeriesChart points={points} color={meta.color} kind="bar" zeroFloor />}
      <p className="mt-2 text-xs text-dim">{a.note}</p>
      <p className="mt-2 text-[10px] text-dim">
        Kp is the planetary geomagnetic index (0–9) from NOAA SWPC. At ~60°N aurora can appear low on the
        horizon from Kp 3, overhead from Kp 5–6 — but only with real darkness and clear skies.
        {!a.darkNight && ' Right now the nights are too bright this far north.'}
      </p>
    </Modal>
  )
}

// ── Events (weather + cosmic) ────────────────────────────────────────────────
export function EventsDetailModal({ wx, onClose, open }: { wx: LocationWeather; onClose: () => void; open: boolean }) {
  if (!open) return null
  return (
    <Modal open onClose={onClose} title="Upcoming Events" code="EVENTS" accent="#9b7bff" width={520}>
      <div className="space-y-1.5">
        {wx.events.map((e) => (
          <EventRow key={e.id} ev={e} />
        ))}
        {wx.events.length === 0 && <div className="text-xs text-dim">Nothing notable on the horizon.</div>}
      </div>
      <p className="mt-3 text-[10px] text-dim">Weather events from the forecast; cosmic events (moon, solstices, meteor showers) computed locally.</p>
    </Modal>
  )
}

// ── Sources / model registry ─────────────────────────────────────────────────
export function SourcesDetailModal({ wx, onClose, open }: { wx: LocationWeather; onClose: () => void; open: boolean }) {
  if (!open) return null
  const spread = wx.modelSpread
  return (
    <Modal open onClose={onClose} title="Sources & Models" code="FEEDS" accent={WEATHER_ACCENT} width={620}>
      {/* Multi-model agreement */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="label" style={{ color: WEATHER_ACCENT }}>
            Model agreement
          </span>
          <span className="text-[11px] text-dim">
            spread {spread.spread}° · {spread.agreement}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {spread.models.map((m) => (
            <div key={m.id} className="border border-line bg-bg/30 px-2 py-1.5">
              <div className="text-[10px] text-dim">{m.label}</div>
              <div className="font-display text-sm text-text">
                {m.temp != null ? `${m.temp}°` : '—'}
                {m.precip24 != null && <span className="ml-1 text-[9px] text-accent">{m.precip24}mm</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full provider registry */}
      <div className="label mb-1 text-dim">Provider registry</div>
      <div className="space-y-1">
        {PROVIDERS.map((p) => {
          const meta = STATUS_META[p.status]
          return (
            <a
              key={p.id}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 border border-line bg-bg/30 px-2 py-1.5 transition-colors hover:bg-panel-2/50"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-text">{p.name}</div>
                <div className="truncate text-[10px] text-dim">{p.role} — {p.detail}</div>
              </div>
              <span className="shrink-0 text-[9px] uppercase tracking-wider" style={{ color: meta.color }}>
                {meta.label}
              </span>
            </a>
          )
        })}
      </div>
    </Modal>
  )
}
