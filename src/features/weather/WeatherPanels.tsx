import { useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  CameraOff,
  Plane,
  Moon as MoonIcon,
  Sunrise,
  Sunset,
  Wind,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Panel } from '@/components/ui/Panel'
import { StatusDot } from '@/components/ui/StatusDot'
import type {
  AirQuality,
  CameraFeed,
  DayForecast,
  HemsConditions,
  LocationWeather,
  RoadCondition,
  SourceStatus,
} from './types'
import { AQI_META, FLY_META, WEATHER_ACCENT } from './format'

const STATE_COLOR: Record<SourceStatus['state'], string> = {
  live: '#46d369',
  cached: '#36e0c8',
  mock: '#6b7785',
  error: '#ff5566',
}

// ── Data sources ─────────────────────────────────────────────────────────────
export function SourcesPanel({ sources }: { sources: SourceStatus[] }) {
  return (
    <Panel title="Data Sources" code="FEEDS" accent={WEATHER_ACCENT} bodyClassName="p-2">
      <div className="space-y-1.5">
        {sources.map((s) => (
          <a
            key={s.id}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 border border-line bg-bg/30 px-2 py-1.5 transition-colors hover:bg-panel-2/60"
          >
            <StatusDot color={STATE_COLOR[s.state]} pulse={s.state === 'live'} size={6} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-xs text-text">
                <span className="truncate">{s.name}</span>
                {s.href && <ArrowUpRight size={10} className="shrink-0 text-dim" />}
              </div>
              <div className="truncate text-[10px] text-dim">{s.detail}</div>
            </div>
            <span
              className="shrink-0 text-[9px] uppercase tracking-wider"
              style={{ color: STATE_COLOR[s.state] }}
            >
              {s.state}
            </span>
          </a>
        ))}
      </div>
      <p className="mt-2 px-1 text-[9px] leading-relaxed text-dim">
        Multiple feeds, cross-read. Live = fetched now; mock = generated fallback; cached = derived/reference.
      </p>
    </Panel>
  )
}

// ── Air quality ──────────────────────────────────────────────────────────────
export function AirQualityPanel({ aq }: { aq: AirQuality }) {
  const meta = AQI_META[aq.band]
  return (
    <Panel title="Air Quality" code="AQI" accent={meta.color} bodyClassName="p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-2xl" style={{ color: meta.color }}>
            {meta.label}
          </div>
          <div className="text-[10px] text-dim">index {aq.aqi} · dominant {aq.dominant}</div>
        </div>
        <div className="text-right text-[10px] text-dim">
          {aq.pm25 != null && <div>PM2.5 {aq.pm25}</div>}
          {aq.pm10 != null && <div>PM10 {aq.pm10}</div>}
          {aq.no2 != null && <div>NO₂ {aq.no2}</div>}
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (aq.aqi / 4) * 100)}%`, background: meta.color }} />
      </div>
    </Panel>
  )
}

// ── HEMS / air-ambulance flyability ──────────────────────────────────────────
export function HemsPanel({ hems, base }: { hems: HemsConditions; base: string }) {
  const meta = FLY_META[hems.band]
  return (
    <Panel title="HEMS Flyability" code="NLA" accent={meta.color} bodyClassName="p-3">
      <div className="flex items-center gap-2">
        <Plane size={18} style={{ color: meta.color }} />
        <span className="font-display text-lg" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="ml-auto text-[10px] text-dim">{base}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <Metric label="Ceiling" value={`${hems.ceilingFt}`} unit="ft" />
        <Metric label="Vis" value={`${hems.visibilityKm}`} unit="km" />
        <Metric label="Wind/gust" value={`${hems.windKt}/${hems.gustKt}`} unit="kt" />
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-dim">{hems.note}</p>
    </Panel>
  )
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="border border-line/70 bg-bg/40 py-1.5">
      <div className="font-display text-sm text-text">
        {value}
        <span className="text-[9px] text-dim"> {unit}</span>
      </div>
      <div className="text-[9px] uppercase tracking-wider text-dim">{label}</div>
    </div>
  )
}

// ── Road conditions (Statens Vegvesen, modelled) ─────────────────────────────
const ROAD_COLOR: Record<RoadCondition['status'], string> = {
  open: '#46d369',
  warning: '#f0a020',
  closed: '#ff5566',
}

export function RoadPanel({ roads }: { roads: RoadCondition[] }) {
  return (
    <Panel title="Roads" code="VEGVESEN" accent="#f0a020" bodyClassName="p-2">
      <div className="space-y-1.5">
        {roads.map((r) => (
          <div key={r.id} className="border border-line bg-bg/30 px-2 py-1.5">
            <div className="flex items-center gap-2">
              <StatusDot color={ROAD_COLOR[r.status]} size={6} />
              <span className="text-xs text-text">
                {r.road} · {r.stretch}
              </span>
              {r.temp != null && <span className="ml-auto text-[10px] text-dim">{r.temp}° surf.</span>}
            </div>
            <div className="mt-0.5 flex items-center gap-1 pl-3.5 text-[10px] text-dim">
              {r.status === 'warning' && <AlertTriangle size={9} className="text-amber" />}
              <span className="font-medium" style={{ color: ROAD_COLOR[r.status] }}>
                {r.surface}
              </span>
              — {r.message}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ── Sun & moon ───────────────────────────────────────────────────────────────
export function SunMoonPanel({ day }: { day?: DayForecast }) {
  const sr = day?.sunrise ? parseISO(day.sunrise) : null
  const ss = day?.sunset ? parseISO(day.sunset) : null
  const daylight =
    sr && ss ? Math.max(0, (ss.getTime() - sr.getTime()) / 3600000) : null
  return (
    <Panel title="Sun & Moon" code="ASTRO" accent="#f0c020" bodyClassName="p-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Sunrise size={16} className="text-amber" />
          <span className="text-text">{sr ? format(sr, 'HH:mm') : '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sunset size={16} className="text-magenta" />
          <span className="text-text">{ss ? format(ss, 'HH:mm') : '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MoonIcon size={15} className="text-dim" />
          <span className="text-dim">{daylight != null ? `${daylight.toFixed(1)}h` : '—'}</span>
        </div>
      </div>
    </Panel>
  )
}

// ── Nowcast (next 90 min precipitation) ──────────────────────────────────────
export function NowcastPanel({ wx }: { wx: LocationWeather }) {
  const nc = wx.nowcast ?? []
  const peak = Math.max(0, ...nc.map((n) => n.precip))
  const dry = peak < 0.05
  return (
    <Panel title="Next 90 min" code="NOWCAST" accent={WEATHER_ACCENT} bodyClassName="p-3">
      {dry ? (
        <div className="text-xs text-dim">No precipitation on radar — staying dry.</div>
      ) : (
        <>
          <div className="flex h-12 items-end gap-0.5">
            {nc.map((n) => (
              <div
                key={n.minutes}
                className="flex-1 rounded-sm"
                style={{ height: `${Math.max(4, (n.precip / peak) * 100)}%`, background: WEATHER_ACCENT, opacity: 0.6 }}
                title={`+${n.minutes}m · ${n.precip} mm/h`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-dim">
            <span>now</span>
            <span>peak {peak.toFixed(1)} mm/h</span>
            <span>+90m</span>
          </div>
        </>
      )}
    </Panel>
  )
}

// ── Road cameras ─────────────────────────────────────────────────────────────
export function CamerasPanel({ cameras }: { cameras: CameraFeed[] }) {
  return (
    <Panel title="Road Cameras" code="LIVE" accent={WEATHER_ACCENT} bodyClassName="p-2">
      <div className="grid grid-cols-2 gap-2">
        {cameras.map((c) => (
          <CameraTile key={c.id} cam={c} />
        ))}
      </div>
    </Panel>
  )
}

function CameraTile({ cam }: { cam: CameraFeed }) {
  const [failed, setFailed] = useState(false)
  // Cache-buster so the still refreshes when the panel mounts.
  const src = `${cam.imageUrl}&t=${Math.floor(Date.now() / 60000)}`
  return (
    <a
      href={cam.mapUrl}
      target="_blank"
      rel="noreferrer"
      className="group relative block aspect-video overflow-hidden border border-line bg-bg/60"
    >
      {failed ? (
        <div className="grid-bg flex h-full w-full flex-col items-center justify-center gap-1 text-dim">
          <CameraOff size={16} />
          <span className="text-[8px] uppercase tracking-wider">offline</span>
        </div>
      ) : (
        <img
          src={src}
          alt={cam.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-bg/80 px-1.5 py-0.5">
        <span className="truncate text-[9px] text-text">{cam.name}</span>
        <span className="flex items-center gap-0.5 text-[8px] text-dim">
          <Wind size={8} /> {cam.road}
        </span>
      </div>
    </a>
  )
}
