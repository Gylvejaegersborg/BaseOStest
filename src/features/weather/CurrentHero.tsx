import { Droplets, Gauge, Wind, Umbrella } from 'lucide-react'
import type { LocationWeather } from './types'
import type { LocationMeta } from './locations'
import { WeatherSymbol, symbolInfo } from './WeatherSymbol'
import { WEATHER_ACCENT, windArrowDir, windLabel } from './format'

/** Big "right now" readout: symbol, temperature and the four numbers you
 *  actually glance at — wind, humidity, pressure, precipitation. */
export function CurrentHero({ loc, wx }: { loc: LocationMeta; wx: LocationWeather }) {
  const c = wx.current
  const info = symbolInfo(c.symbol)

  return (
    <div className="border border-line bg-panel/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <WeatherSymbol code={c.symbol} size={64} />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl leading-none text-text">{Math.round(c.temp)}°</span>
              <span className="text-sm text-dim">feels {Math.round(c.feelsLike)}°</span>
            </div>
            <div className="mt-1 text-sm" style={{ color: info.tone }}>
              {info.label}
            </div>
            <div className="text-xs text-dim">
              {loc.name} · {loc.region}
            </div>
          </div>
        </div>
        <div className="hidden text-right text-[11px] text-dim sm:block">
          <div className="label" style={{ color: WEATHER_ACCENT }}>
            NOW
          </div>
          <div className="mt-1 max-w-[180px] text-dim">{loc.blurb}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={Wind} label="Wind" value={`${c.windSpeed.toFixed(1)} m/s`} sub={`${windArrowDir(c.windDir)} · ${windLabel(c.windSpeed)}`} />
        <Stat icon={Umbrella} label="Precip" value={`${c.precip.toFixed(1)} mm`} sub={c.precipProb != null ? `${c.precipProb}% chance` : 'last hour'} />
        <Stat icon={Droplets} label="Humidity" value={`${Math.round(c.humidity)}%`} sub={`cloud ${Math.round(c.cloud)}%`} />
        <Stat icon={Gauge} label="Pressure" value={`${Math.round(c.pressure)}`} sub="hPa" />
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Wind
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="border border-line/70 bg-bg/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-dim">
        <Icon size={12} /> {label}
      </div>
      <div className="mt-0.5 font-display text-lg text-text">{value}</div>
      <div className="text-[10px] text-dim">{sub}</div>
    </div>
  )
}
