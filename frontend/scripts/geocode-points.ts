/**
 * Геокодирование официальных пунктов приёма населения через TomTom Search API.
 *
 *   node scripts/geocode-points.ts            — геокодировать (ключ: VITE_TOMTOM_KEY из frontend/.env)
 *   node scripts/geocode-points.ts --pending  — записать «ещё не геокодировано» (без запросов)
 *
 * Вход:  src/data/assemblyPoints.source.json — дословно из распоряжения акима №123ө
 * Выход: src/data/assemblyPoints.json
 *
 * Правила (никаких примерных координат):
 *  - координаты берём только из ответа TomTom: точный адрес (Point Address с тем же
 *    номером дома) или POI этого учреждения, чей адрес в TomTom совпадает с официальным;
 *  - результат вне Алматы или в другом районе отбрасываем;
 *  - уверенность геокодера < 0.8 или расхождение адреса и POI > 300 м → needsReview;
 *  - needsReview: true → lat/lng: null, точка не рисуется на карте; список печатается.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { request } from 'node:https'
import { fileURLToPath } from 'node:url'
import {
  extractHouseNumber,
  extractStreetName,
  normalizeHouseNumber,
  queryVariants,
} from '../src/lib/addressNormalize.ts'

type PointType = 'school' | 'kindergarten' | 'university' | 'college' | 'stadium' | 'arena'

interface SourcePoint {
  id: string
  district: string
  name: string
  address: string
  type: PointType
  source: string
}

interface TTAddress {
  streetNumber?: string
  streetName?: string
  municipality?: string
  municipalitySubdivision?: string
  countrySubdivision?: string
  freeformAddress?: string
}

interface TTResult {
  type: string
  position: { lat: number; lon: number }
  address: TTAddress
  matchConfidence?: { score?: number }
  poi?: { name?: string }
}

interface OutPoint extends SourcePoint {
  lat: number | null
  lng: number | null
  geocodeConfidence: number | null
  needsReview: boolean
  geocodeMethod: 'address' | 'address+poi' | 'poi-address-match' | 'review' | 'pending'
  geocodeNote: string
}

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = `${ROOT}src/data/assemblyPoints.source.json`
const OUT = `${ROOT}src/data/assemblyPoints.json`

const CENTER = { lat: 43.238, lon: 76.945 }
const BBOX = { minLat: 43.05, maxLat: 43.45, minLon: 76.6, maxLon: 77.2 }
const MIN_CONFIDENCE = 0.8
const MAX_DISAGREEMENT_M = 300
const GAP_MS = 250

const DISTRICT_RE: Record<string, RegExp> = {
  Алатауский: /алатау/i,
  Алмалинский: /алмал/i,
  Ауэзовский: /(ауэзов|әуезов)/i,
  Бостандыкский: /(бостандык|бостандық)/i,
  Жетысуский: /(жетысу|жетісу)/i,
  Медеуский: /медеу/i,
  Наурызбайский: /наурызбай/i,
  Турксибский: /(турксиб|түрксіб)/i,
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

class TomTomForbidden extends Error {}

// В некоторых окружениях (прокси, песочницы) fetch/undici не соединяется,
// а node:https работает — поэтому простой GET на https.request.
function getJson(url: URL, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: 'GET', headers: { Accept: 'application/json', ...headers } }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk: string) => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
    })
    req.on('error', reject)
    req.setTimeout(9000, () => req.destroy(new Error('TomTom: таймаут запроса')))
    req.end()
  })
}

try {
  process.loadEnvFile(`${ROOT}.env`)
} catch {
  /* .env может отсутствовать — тогда ключ должен быть в окружении */
}
const KEY = process.env.VITE_TOMTOM_KEY ?? ''

async function tomtom(path: string, params: Record<string, string | number>): Promise<TTResult[]> {
  const url = new URL(`https://api.tomtom.com${path}`)
  url.searchParams.set('key', KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  for (let attempt = 0; attempt < 6; attempt++) {
    let res: { status: number; body: string }
    try {
      res = await getJson(url)
    } catch {
      // Нестабильная сеть (таймаут / ECONNRESET) — повторяем с паузой
      await sleep(800 * (attempt + 1))
      continue
    }
    if (res.status === 429) {
      await sleep(1200 * (attempt + 1))
      continue
    }
    if (res.status === 403) throw new TomTomForbidden('403')
    // URL не печатаем — в нём ключ
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`TomTom HTTP ${res.status} (${path.split('/').slice(0, 4).join('/')})`)
    }
    const data = JSON.parse(res.body) as { results?: TTResult[] }
    await sleep(GAP_MS)
    return data.results ?? []
  }
  throw new Error('TomTom недоступен: сеть или лимит запросов')
}

const BIAS = {
  countrySet: 'KZ',
  language: 'ru-RU',
  lat: CENTER.lat,
  lon: CENTER.lon,
  radius: 30000,
}

// ---------- Провайдер: TomTom (по умолчанию) или OpenStreetMap Nominatim ----------
const PROVIDER: 'tomtom' | 'nominatim' = process.argv.includes('--provider=nominatim') ? 'nominatim' : 'tomtom'
const PROVIDER_NAME = PROVIDER === 'tomtom' ? 'TomTom' : 'OpenStreetMap (Nominatim)'

interface NominatimItem {
  lat: string
  lon: string
  name?: string
  display_name: string
  category?: string
  type?: string
  address?: Record<string, string>
}

// Политика Nominatim: свой User-Agent и не чаще 1 запроса в секунду.
async function nominatim(q: string, limit: number): Promise<TTResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('countrycodes', 'kz')
  url.searchParams.set('accept-language', 'ru')
  url.searchParams.set('viewbox', `${BBOX.minLon},${BBOX.maxLat},${BBOX.maxLon},${BBOX.minLat}`)
  url.searchParams.set('bounded', '1')
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(1100)
    let res: { status: number; body: string }
    try {
      res = await getJson(url, { 'User-Agent': 'gotov-k-tolchku/0.2 (hackathon MVP; geocoding official points)' })
    } catch {
      await sleep(1500 * (attempt + 1))
      continue
    }
    if (res.status === 429) {
      await sleep(3000 * (attempt + 1))
      continue
    }
    if (res.status < 200 || res.status >= 300) throw new Error(`Nominatim HTTP ${res.status}`)
    const items = JSON.parse(res.body) as NominatimItem[]
    return items.map((it) => {
      const a = it.address ?? {}
      return {
        type: a.house_number ? 'Point Address' : (it.type ?? 'place'),
        position: { lat: Number(it.lat), lon: Number(it.lon) },
        address: {
          streetNumber: a.house_number,
          streetName: a.road ?? a.neighbourhood ?? a.suburb,
          municipality: a.city ?? a.town,
          municipalitySubdivision: a.city_district,
          freeformAddress: it.display_name,
        },
        poi: it.name ? { name: it.name } : undefined,
      }
    })
  }
  throw new Error('Nominatim недоступен: сеть или лимит запросов')
}

function searchAddressProvider(q: string): Promise<TTResult[]> {
  return PROVIDER === 'tomtom'
    ? tomtom(`/search/2/geocode/${encodeURIComponent(`${q}, Алматы`)}.json`, { ...BIAS, limit: 5 })
    : nominatim(`${q}, Алматы`, 5)
}

function searchPoiProvider(name: string): Promise<TTResult[]> {
  return PROVIDER === 'tomtom'
    ? tomtom(`/search/2/poiSearch/${encodeURIComponent(name)}.json`, { ...BIAS, limit: 10 })
    : nominatim(`${name}, Алматы`, 8)
}

function inAlmaty(r: TTResult): boolean {
  const { lat, lon } = r.position
  const inBox = lat >= BBOX.minLat && lat <= BBOX.maxLat && lon >= BBOX.minLon && lon <= BBOX.maxLon
  const place = [r.address.municipality, r.address.countrySubdivision, r.address.freeformAddress]
    .filter(Boolean)
    .join(' ')
  return inBox && /(алматы|almaty)/i.test(place)
}

/** Район в ответе TomTom совпадает с официальным (если TomTom его вернул). */
function sameDistrict(r: TTResult, district: string): boolean {
  const sub = r.address.municipalitySubdivision
  const re = DISTRICT_RE[district]
  return !sub || !re || re.test(sub)
}

async function geocodeAddress(p: SourcePoint) {
  const houseNo = normalizeHouseNumber(extractHouseNumber(p.address))
  let nearMiss: TTResult | null = null
  for (const q of queryVariants(p.address)) {
    const results = (await searchAddressProvider(q)).filter(inAlmaty)
    const exact = results.find(
      (r) =>
        r.type === 'Point Address' &&
        normalizeHouseNumber(r.address.streetNumber) === houseNo &&
        sameDistrict(r, p.district),
    )
    if (exact) return { hit: exact, nearMiss: null }
    nearMiss ??= results[0] ?? null
  }
  return { hit: null, nearMiss }
}

const GENERIC =
  /^(школа|лицей|гимназия|школа-лицей|школа-гимназия|университет|академия|казахская|алматинский|колледж|стадион|дворец|им\.?|спорта|и|туризма|школьников|гражданской|авиации)$/i

async function findPoi(p: SourcePoint): Promise<TTResult | null> {
  const num = p.name.match(/№\s*(\d+)/)?.[1] ?? null
  const q = p.name.replace(/[«»"]/g, '')
  const results = (await searchPoiProvider(q))
    .filter(inAlmaty)
    .filter((r) => r.poi?.name)
  const match = results.find((r) => {
    const name = (r.poi?.name ?? '').toLowerCase()
    if (num) {
      return (
        new RegExp(`(?<!\\d)${num}(?!\\d)`).test(name) &&
        /(школ|лице|гимнази|мектеп|school|lyceum|gymnasium)/i.test(name)
      )
    }
    const keys = q.split(/\s+/).filter((w) => w.length >= 4 && !GENERIC.test(w))
    return keys.some((k) => name.includes(k.toLowerCase()))
  })
  return match ?? null
}

function poiAddressMatches(poi: TTResult, p: SourcePoint): boolean {
  const sameNumber =
    normalizeHouseNumber(poi.address.streetNumber) === normalizeHouseNumber(extractHouseNumber(p.address))
  const street = extractStreetName(p.address)?.toLowerCase().slice(0, 6)
  const sameStreet = Boolean(street && poi.address.streetName?.toLowerCase().includes(street))
  return sameNumber && sameStreet && sameDistrict(poi, p.district)
}

function pending(p: SourcePoint): OutPoint {
  return {
    ...p,
    lat: null,
    lng: null,
    geocodeConfidence: null,
    needsReview: true,
    geocodeMethod: 'pending',
    geocodeNote: 'Ещё не геокодировано',
  }
}

function toOrdered(o: OutPoint) {
  // Порядок полей — как в ТЗ
  return {
    id: o.id,
    district: o.district,
    name: o.name,
    address: o.address,
    lat: o.lat,
    lng: o.lng,
    type: o.type,
    source: o.source,
    geocodeConfidence: o.geocodeConfidence,
    needsReview: o.needsReview,
    geocodeMethod: o.geocodeMethod,
    geocodeProvider: o.needsReview ? null : PROVIDER,
    geocodeNote: o.geocodeNote,
  }
}

async function geocodeOne(p: SourcePoint): Promise<OutPoint> {
  const addr = await geocodeAddress(p)
  const poi = await findPoi(p)
  const round = (n: number) => Math.round(n * 1e6) / 1e6

  if (addr.hit) {
    const conf = addr.hit.matchConfidence?.score ?? null
    if (conf !== null && conf < MIN_CONFIDENCE) {
      return { ...pending(p), geocodeMethod: 'review', geocodeNote: `Низкая уверенность геокодера: ${conf}` }
    }
    if (poi) {
      const d = Math.round(haversine(addr.hit.position, poi.position))
      if (d > MAX_DISAGREEMENT_M) {
        return {
          ...pending(p),
          geocodeMethod: 'review',
          geocodeNote: `${PROVIDER_NAME}: адрес и POI «${poi.poi?.name}» расходятся на ${d} м`,
        }
      }
    }
    return {
      ...p,
      lat: round(addr.hit.position.lat),
      lng: round(addr.hit.position.lon),
      geocodeConfidence: conf,
      needsReview: false,
      geocodeMethod: poi ? 'address+poi' : 'address',
      geocodeNote: poi
        ? `${PROVIDER_NAME}: точный адрес, подтверждён POI «${poi.poi?.name}»`
        : `${PROVIDER_NAME}: точный адрес — ${addr.hit.address.freeformAddress ?? ''}`,
    }
  }

  if (poi && poiAddressMatches(poi, p)) {
    return {
      ...p,
      lat: round(poi.position.lat),
      lng: round(poi.position.lon),
      geocodeConfidence: poi.matchConfidence?.score ?? null,
      needsReview: false,
      geocodeMethod: 'poi-address-match',
      geocodeNote: `${PROVIDER_NAME}: POI «${poi.poi?.name}», адрес совпадает с официальным`,
    }
  }

  const miss = addr.nearMiss
  return {
    ...pending(p),
    geocodeMethod: 'review',
    geocodeNote: miss
      ? `${PROVIDER_NAME} нашёл только «${miss.address.freeformAddress}» (${miss.type}) — нет точного дома`
      : `${PROVIDER_NAME} не нашёл адрес в Алматы`,
  }
}

async function main() {
  const source = JSON.parse(readFileSync(SRC, 'utf8')) as SourcePoint[]

  if (process.argv.includes('--pending')) {
    writeFileSync(OUT, `${JSON.stringify(source.map(pending).map(toOrdered), null, 2)}\n`)
    console.log(`Записано ${source.length} пунктов со статусом «ещё не геокодировано».`)
    return
  }

  if (PROVIDER === 'tomtom' && !KEY) {
    console.error('Нет VITE_TOMTOM_KEY (frontend/.env). Геокодирование невозможно.')
    process.exit(1)
  }

  const out: OutPoint[] = []
  for (const [i, p] of source.entries()) {
    try {
      const r = await geocodeOne(p)
      out.push(r)
      const mark = r.needsReview ? 'REVIEW' : 'ok    '
      console.log(`${String(i + 1).padStart(2)}/${source.length} ${mark} ${p.name} — ${r.geocodeNote}`)
    } catch (e) {
      if (e instanceof TomTomForbidden) {
        console.error(
          '\nTomTom ответил 403: у ключа нет доступа к Search API.\n' +
            'Включите Search API для ключа (developer.tomtom.com → Keys) и запустите снова.\n' +
            'Файл src/data/assemblyPoints.json не изменён.',
        )
        process.exit(2)
      }
      throw e
    }
  }

  writeFileSync(OUT, `${JSON.stringify(out.map(toOrdered), null, 2)}\n`)

  const review = out.filter((o) => o.needsReview)
  console.log(`\nГотово: ${out.length - review.length} с координатами, ${review.length} needsReview.`)
  if (review.length) {
    console.log('\nТребуют проверки (координаты НЕ подставлены):')
    console.table(review.map((o) => ({ id: o.id, district: o.district, name: o.name, address: o.address, note: o.geocodeNote })))
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
