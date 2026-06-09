# Weather Proxy

A tiny server-side proxy for weather providers the **Weather** section can't call
directly from the browser — either because they need an API key (kept off the
client) or because they block CORS. Run it on your homeserver next to the
Discord bridge.

```
browser (Weather section) ──HTTP──► weather-proxy ──► MeteoAlarm / Met Office
   VITE_WEATHER_PROXY_URL            - normalises CAP feed to JSON
                                     - holds the Met Office key
                                     - caches + filters by lat/lon
```

When `VITE_WEATHER_PROXY_URL` is **unset**, the app just runs on its live
browser-reachable feeds (MET Norway, Open-Meteo, NOAA SWPC) plus the generated
fallback — the proxy is purely additive.

## Providers

| Route          | Provider                | Key needed | Notes                                                |
| -------------- | ----------------------- | ---------- | ---------------------------------------------------- |
| `/meteoalarm`  | EUMETNET MeteoAlarm     | no         | Key-less but CORS-blocked. Parsed from the legacy CAP/ATOM feed. |
| `/metoffice`   | Met Office DataHub      | yes        | Returns `503` until `METOFFICE_API_KEY` is set.      |

## Endpoints

- `GET /health` → `{ ok, providers: { meteoalarm, metoffice } }`
- `GET /meteoalarm?country=norway&lat=&lon=` → `{ country, count, alerts: AlertItem[] }`
  - `country` — lowercase English name (default from `METEOALARM_COUNTRY`).
  - `lat`/`lon` — optional; filters to alerts whose warning **polygon contains
    the point** (ray-casting). Alerts without a polygon are kept.
- `GET /metoffice?lat=&lon=&timesteps=daily|hourly` → DataHub GeoJSON (keyed).

`AlertItem`: `{ id, country, area, event, severity, awarenessLevel (1–4),
color, headline, sent?, onset?, expires?, url? }`.

## Setup

```bash
cd weather-proxy
cp .env.example .env      # adjust PORT / ALLOWED_ORIGIN / METEOALARM_COUNTRY
npm install
npm run dev               # or: npm run build && npm start
```

Then point the app at it:

```bash
# in the repo root .env.local
VITE_WEATHER_PROXY_URL=http://homeserver.local:8788
```

Alerts then show up in the Weather section's **Upcoming** feed (and the data
sources panel reports MeteoAlarm as `live`).

## Notes

- The proxy caches upstream responses for `CACHE_TTL_MS` (default 5 min) — please
  be a good citizen with MeteoAlarm's feed.
- MeteoAlarm's feed format can vary slightly between countries/versions; the
  parser is defensive and maps the awareness colour from the entry title
  (Green/Yellow/Orange/Red → level 1–4).
- The Met Office route is a **scaffold**: the auth + request shape are wired, but
  the exact DataHub path/`dataSource` may need to match your subscription tier.
