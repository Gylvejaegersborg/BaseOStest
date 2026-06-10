# Weather (MET.08)

A new *sun* in the Constellation: a weather section for the three places this OS
revolves around — **Oslo**, **Hamar** and **Trysil** — themed like the rest of
the terminal OS (dark panels, mono type, HUD accents).

Weather reporting is usually bad because it leans on a single feed. This section
deliberately reads **multiple sources** and is honest about which are live.

## Sources

| Feed | Provider | What it gives | Live? |
| --- | --- | --- | --- |
| Locationforecast 2.0 | MET Norway (the data behind Yr.no) | hourly + daily forecast | yes, fetched |
| Nowcast 2.0 | MET Norway | 5-min radar precip, next ~90 min (Nordics) | yes, fetched |
| Forecast + UV + sun | Open-Meteo | UV index, multi-day sunrise/sunset | yes, fetched |
| Multi-model ensemble | Open-Meteo (ECMWF, DWD, NOAA GFS, Météo-France, JMA, ECCC, BoM) | model-agreement spread | yes, fetched |
| Air Quality | Open-Meteo | European AQI series + pollutants | yes, fetched |
| Planetary K-index | NOAA SWPC | aurora / geomagnetic forecast | yes, fetched |
| MeteoAlarm alerts | EUMETNET (via `weather-proxy`) | severe-weather warnings | when proxy configured |
| Road surface & status | Statens Vegvesen (reference) | road condition per stretch | modelled from forecast |
| Road cameras | Statens Vegvesen / kamerakartet.no | live webcam stills | public feeds, best-effort |
| HEMS flyability | derived (à la Norsk Luftambulanse) | VFR ceiling / vis / wind | derived from MET |

Every call runs independently (`Promise.allSettled`) so one failing — CORS,
rate limit, a sandboxed network — never blanks the page. Anything that can't be
fetched falls back to a **deterministic generator** (`mockData.ts`) that produces
plausible Norwegian weather, and the **Data Sources** panel labels each feed:

- `live` — fetched just now
- `mock` — generated fallback
- `cached` — derived / reference data

The HEMS and road-surface panels are transparent heuristics derived from the MET
forecast, not official operational feeds, and are labelled accordingly.

## Output

- **Quick-read panels** (most drill into a multi-day detail modal on click):
  current-conditions hero (each metric clickable), sources & models, upcoming
  events, nowcast, sun & moon (+ moon phase), UV index, northern lights, air
  quality, HEMS flyability, roads, cameras.
- **Drill-downs:** clicking a panel/metric opens an hourly chart + per-day
  summary (`SeriesChart` + `WeatherDetailModals.tsx`).
- **Graph:** an hourly meteogram (temperature curve + precipitation bars +
  symbols + day/night shading).
- **Calendar:** a *week* outlook (range bars) and a *month* grid that mirrors the
  OS Calendar's month view — forecast where available, climatology beyond.
- **Trackers:** UV index (multi-day) and a northern-lights tracker that reasons
  over Kp + latitude + darkness (honest about bright Nordic summer nights).
- **Events:** weather events from the forecast + a locally-computed cosmic
  calendar (moon phases, solstices/equinoxes, meteor showers) + aurora + alerts.
- **Symbols:** MET symbol codes mapped to themed icons (`symbols.tsx`).

## Files

- `useWeather.ts` — aggregates feeds, tracks source status, falls back.
- `metClient.ts`, `openMeteoClient.ts`, `openMeteoAir.ts`, `swpcClient.ts` —
  typed clients for the live feeds (no keys; browser fetch).
- `proxyClient.ts` — optional `weather-proxy` (MeteoAlarm alerts / keyed feeds).
- `mockData.ts` — deterministic fallback + climatology.
- `astro.ts`, `events.ts`, `hems.ts`, `roads.ts`, `cameras.ts`, `models.ts` —
  derived data + the provider registry.
- `HourlyGraph.tsx`, `SeriesChart.tsx`, `WeekStrip.tsx`, `WeatherMonth.tsx`,
  `CurrentHero.tsx`, `WeatherPanels.tsx`, `WeatherDetailModals.tsx` — the views.
