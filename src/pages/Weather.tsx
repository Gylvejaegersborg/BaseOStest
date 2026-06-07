import { useMemo, useState } from 'react'
import { addMonths, format, isSameDay, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, MapPin, RefreshCw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { LOCATIONS, locationById } from '@/features/weather/locations'
import type { LocationId, DayForecast } from '@/features/weather/types'
import { useWeather } from '@/features/weather/useWeather'
import { deriveRoads } from '@/features/weather/roads'
import { camerasNear } from '@/features/weather/cameras'
import { HEMS_BASE } from '@/features/weather/hems'
import { WEATHER_ACCENT, windArrowDir } from '@/features/weather/format'
import { CurrentHero, type MetricKey } from '@/features/weather/CurrentHero'
import { HourlyGraph } from '@/features/weather/HourlyGraph'
import { WeekStrip } from '@/features/weather/WeekStrip'
import { WeatherMonth } from '@/features/weather/WeatherMonth'
import { WeatherSymbol, symbolInfo } from '@/features/weather/WeatherSymbol'
import {
  AirQualityPanel,
  AuroraPanel,
  CamerasPanel,
  EventsPanel,
  HemsPanel,
  NowcastPanel,
  RoadPanel,
  SourcesPanel,
  SunMoonPanel,
  UvPanel,
} from '@/features/weather/WeatherPanels'
import {
  AirDetailModal,
  AstroDetailModal,
  AuroraDetailModal,
  EventsDetailModal,
  MetricDetailModal,
  SourcesDetailModal,
  UvDetailModal,
} from '@/features/weather/WeatherDetailModals'

type View = 'today' | 'week' | 'month'

type Detail =
  | { type: 'metric'; metric: MetricKey }
  | { type: 'astro' }
  | { type: 'air' }
  | { type: 'uv' }
  | { type: 'aurora' }
  | { type: 'events' }
  | { type: 'sources' }

export function Weather() {
  const [locId, setLocId] = useState<LocationId>('oslo')
  const [view, setView] = useState<View>('today')
  const [monthOffset, setMonthOffset] = useState(0)
  const [dayDetail, setDayDetail] = useState<DayForecast | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)

  const loc = locationById(locId)
  const { data: wx, sources, loading, refresh, updatedAgo } = useWeather(locId)

  const roads = useMemo(() => deriveRoads(locId, wx.hours), [locId, wx.hours])
  const cameras = useMemo(() => camerasNear(locId), [locId])
  const month = useMemo(() => addMonths(new Date(), monthOffset), [monthOffset])

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* Main column */}
      <div className="flex min-w-0 flex-col lg:flex-1 lg:overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg tracking-wider text-text">WEATHER</h1>
            <span className="flex items-center gap-1 text-xs text-dim">
              <MapPin size={12} /> {loc.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Location switcher */}
            <div className="flex border border-line">
              {LOCATIONS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLocId(l.id)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors',
                    l.id === locId ? 'bg-panel-2' : 'text-dim hover:text-text',
                  )}
                  style={l.id === locId ? { color: WEATHER_ACCENT } : undefined}
                >
                  {l.name}
                </button>
              ))}
            </div>
            {/* View toggle */}
            <div className="flex border border-line">
              {(['today', 'week', 'month'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-2 py-1 text-[11px] uppercase tracking-wider transition-colors',
                    view === v ? 'bg-panel-2 text-text' : 'text-dim hover:text-text',
                  )}
                  style={view === v ? { color: WEATHER_ACCENT } : undefined}
                >
                  {v}
                </button>
              ))}
            </div>
            {/* Month nav (month view only) */}
            {view === 'month' && (
              <div className="flex items-center gap-1">
                <button onClick={() => setMonthOffset((m) => m - 1)} className="border border-line p-1 text-dim hover:text-text">
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setMonthOffset(0)}
                  className="border border-line px-2 py-1 text-[11px] uppercase tracking-wider text-dim hover:text-text"
                >
                  {format(month, 'MMM yy')}
                </button>
                <button onClick={() => setMonthOffset((m) => m + 1)} className="border border-line p-1 text-dim hover:text-text">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
            {/* Refresh */}
            <button
              onClick={refresh}
              title="Refresh feeds"
              className="flex items-center gap-1 border border-line px-2 py-1 text-[11px] uppercase tracking-wider text-dim hover:text-text"
            >
              <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
              <span className="hidden sm:inline">{updatedAgo}</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {view === 'today' && (
            <div className="space-y-4">
              <CurrentHero loc={loc} wx={wx} onMetric={(m) => setDetail({ type: 'metric', metric: m })} />
              <div className="border border-line bg-panel/40">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <h2 className="font-display text-sm uppercase tracking-wider" style={{ color: WEATHER_ACCENT }}>
                    Hourly
                  </h2>
                  <span className="text-[10px] text-dim">next 48h · temp + precip</span>
                </div>
                <div className="p-2">
                  <HourlyGraph hours={wx.hours} />
                </div>
              </div>
            </div>
          )}

          {view === 'week' && (
            <div className="space-y-3">
              <div className="text-xs text-dim">9-day outlook for {loc.name}</div>
              <WeekStrip days={wx.days} onSelectDay={setDayDetail} />
            </div>
          )}

          {view === 'month' && (
            <div className="flex h-full flex-col">
              <div className="mb-2 text-xs text-dim">
                {format(month, 'MMMM yyyy')} · forecast where available, climatology beyond
              </div>
              <WeatherMonth month={month} loc={loc} days={wx.days} onSelectDay={setDayDetail} />
            </div>
          )}
        </div>
      </div>

      {/* Side panels — quick-read, each drills into multi-day detail */}
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t border-line bg-panel/30 p-3 lg:w-[330px] lg:border-l lg:border-t-0">
        <SourcesPanel sources={sources} onClick={() => setDetail({ type: 'sources' })} />
        <EventsPanel events={wx.events} onClick={() => setDetail({ type: 'events' })} />
        <NowcastPanel wx={wx} />
        <SunMoonPanel day={wx.days[0]} moon={wx.moon} onClick={() => setDetail({ type: 'astro' })} />
        <UvPanel uvHours={wx.uvHours} todayMax={wx.days[0]?.uvMax} onClick={() => setDetail({ type: 'uv' })} />
        <AuroraPanel aurora={wx.aurora} onClick={() => setDetail({ type: 'aurora' })} />
        <AirQualityPanel aq={wx.airQuality} onClick={() => setDetail({ type: 'air' })} />
        <HemsPanel hems={wx.hems} base={HEMS_BASE[locId]} />
        <RoadPanel roads={roads} />
        <CamerasPanel cameras={cameras} />
      </aside>

      <DayDetailModal day={dayDetail} hours={wx.hours} onClose={() => setDayDetail(null)} />

      {/* Drill-down detail modals */}
      <MetricDetailModal
        metric={detail?.type === 'metric' ? detail.metric : null}
        wx={wx}
        onClose={() => setDetail(null)}
      />
      <AstroDetailModal open={detail?.type === 'astro'} wx={wx} onClose={() => setDetail(null)} />
      <AirDetailModal open={detail?.type === 'air'} wx={wx} onClose={() => setDetail(null)} />
      <UvDetailModal open={detail?.type === 'uv'} wx={wx} onClose={() => setDetail(null)} />
      <AuroraDetailModal open={detail?.type === 'aurora'} wx={wx} onClose={() => setDetail(null)} />
      <EventsDetailModal open={detail?.type === 'events'} wx={wx} onClose={() => setDetail(null)} />
      <SourcesDetailModal open={detail?.type === 'sources'} wx={wx} onClose={() => setDetail(null)} />
    </div>
  )
}

function DayDetailModal({
  day,
  hours,
  onClose,
}: {
  day: DayForecast | null
  hours: { time: string; temp: number; precip: number; windSpeed: number; windDir: number; symbol: string }[]
  onClose: () => void
}) {
  if (!day) return null
  const date = parseISO(day.date)
  const info = symbolInfo(day.symbol)
  const dayHours = hours.filter((h) => isSameDay(parseISO(h.time), date))

  return (
    <Modal open={!!day} onClose={onClose} title={format(date, 'EEEE d MMM')} code="FORECAST" accent={WEATHER_ACCENT} width={520}>
      <div className="flex items-center gap-4 border-b border-line pb-3">
        <WeatherSymbol code={day.symbol} size={48} />
        <div>
          <div className="font-display text-lg text-text">
            {day.max}° <span className="text-dim">/ {day.min}°</span>
          </div>
          <div className="text-sm" style={{ color: info.tone }}>
            {info.label}
          </div>
          <div className="text-[11px] text-dim">
            {day.precipSum > 0 ? `${day.precipSum} mm precip · ` : 'dry · '}
            wind up to {Math.round(day.windMax)} m/s
            {!day.forecast && ' · climatology estimate'}
          </div>
        </div>
      </div>

      {dayHours.length > 0 ? (
        <div className="mt-3 max-h-[50vh] divide-y divide-line/60 overflow-y-auto">
          {dayHours.map((h) => (
            <div key={h.time} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="w-12 tabular-nums text-dim">{format(parseISO(h.time), 'HH:mm')}</span>
              <WeatherSymbol code={h.symbol} size={20} />
              <span className="w-10 tabular-nums text-text">{Math.round(h.temp)}°</span>
              <span className="w-16 text-[11px] text-dim">
                {h.precip > 0 ? `${h.precip.toFixed(1)} mm` : '—'}
              </span>
              <span className="ml-auto text-[11px] text-dim">
                {h.windSpeed.toFixed(1)} m/s {windArrowDir(h.windDir)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-dim">
          Beyond the hourly horizon — showing the daily climatology estimate only.
        </p>
      )}
    </Modal>
  )
}
