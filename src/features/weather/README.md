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
| Sunrise 3.0 | MET Norway | sunrise / sunset | yes, fetched |
| Airqualityforecast | MET Norway | AQI + pollutants | yes, fetched |
| Road surface & status | Statens Vegvesen (reference) | road condition per stretch | modelled from forecast |
| Road cameras | Statens Vegvesen / kamerakartet.no | live webcam stills | public feeds, best-effort |
| HEMS flyability | derived (à la Norsk Luftambulanse) | VFR ceiling / vis / wind | derived from MET |

Every MET call runs independently (`Promise.allSettled`) so one failing — CORS,
rate limit, a sandboxed network — never blanks the page. Anything that can't be
fetched falls back to a **deterministic generator** (`mockData.ts`) that produces
plausible Norwegian weather, and the **Data Sources** panel labels each feed:

- `live` — fetched just now
- `mock` — generated fallback
- `cached` — derived / reference data

The HEMS and road-surface panels are transparent heuristics derived from the MET
forecast, not official operational feeds, and are labelled accordingly.

## Output

- **Quick-read panels:** current conditions hero, sources, nowcast, air quality,
  HEMS flyability, roads, sun & moon, cameras.
- **Graph:** an hourly meteogram (temperature curve + precipitation bars +
  symbols + day/night shading).
- **Calendar:** a *week* outlook (range bars) and a *month* grid that mirrors the
  OS Calendar's month view — forecast where available, climatology beyond.
- **Symbols:** MET symbol codes mapped to themed icons (`symbols.tsx`).

## Files

- `useWeather.ts` — aggregates feeds, tracks source status, falls back.
- `metClient.ts` — typed MET Norway client (no key; browser fetch).
- `mockData.ts` — deterministic fallback + climatology.
- `hems.ts`, `roads.ts`, `cameras.ts` — derived / reference feeds.
- `HourlyGraph.tsx`, `WeekStrip.tsx`, `WeatherMonth.tsx`, `CurrentHero.tsx`,
  `WeatherPanels.tsx` — the views.
