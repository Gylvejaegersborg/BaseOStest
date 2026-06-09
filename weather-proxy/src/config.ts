import 'dotenv/config'

export const PORT = Number(process.env.PORT ?? 8788)
export const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*'
export const METEOALARM_COUNTRY = (process.env.METEOALARM_COUNTRY ?? 'norway').toLowerCase()
export const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 5 * 60 * 1000)
export const METOFFICE_API_KEY = process.env.METOFFICE_API_KEY ?? ''
