/**
 * Сборка списка демо-домов из открытых данных — node scripts/build-houses.ts
 *
 *  1) Overpass (OpenStreetMap): жилые дома Алматы, у которых указана этажность
 *     И год постройки или конструктивный материал. Отбор — поровну из разных
 *     эпох постройки, без повторов адреса и не ближе 400 м друг к другу;
 *  2) Nominatim reverse: район города; Overpass: русское название улицы
 *     (name:ru), если в OSM адрес записан по-казахски;
 *  3) Valhalla (OSM, пешеход): маршруты к 5 ближайшим официальным пунктам
 *     (только с подтверждёнными координатами), берём самый быстрый — это запасной
 *     маршрут на случай, если сервис маршрутов недоступен во время показа.
 *
 * Выход: src/data/demoHouses.json. Всё — реальные данные OSM со ссылкой way/ID.
 * Ничего не выдумываем: нет значения в OSM — null.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { request } from 'node:https'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = `${ROOT}src/data/demoHouses.json`
const POINTS = `${ROOT}src/data/assemblyPoints.json`
const UA = 'gotov-k-tolchku/0.2 (hackathon MVP; demo houses)'
const MAX_HOUSES = 20
const STRUCTURAL = /^(brick|block|concrete_block|concrete|reinforced_concrete|panels?|concrete_panels?|stone|adobe|mud)$/

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function http(method: 'GET' | 'POST', url: URL, body?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method,
        headers: {
          Accept: 'application/json',
          'User-Agent': UA,
          ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
      },
      (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (c: string) => (data += c))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }))
      },
    )
    req.on('error', reject)
    req.setTimeout(70000, () => req.destroy(new Error('timeout')))
    if (body) req.write(body)
    req.end()
  })
}

async function withRetry<T>(label: string, fn: () => Promise<{ status: number; body: string }>, parse: (b: string) => T) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fn()
      if (res.status === 200) return parse(res.body)
      console.log(`  ${label}: HTTP ${res.status}, повтор ${attempt}`)
    } catch (e) {
      console.log(`  ${label}: сеть (${(e as Error).message}), повтор ${attempt}`)
    }
    await sleep(3000 * attempt)
  }
  throw new Error(`${label}: не удалось`)
}

interface OsmWay {
  type: 'way'
  id: number
  center: { lat: number; lon: number }
  tags: Record<string, string>
}

async function overpass(filter: string): Promise<OsmWay[]> {
  const q = `[out:json][timeout:50][bbox:43.15,76.75,43.36,77.05];way["building"~"^(apartments|residential)$"]["addr:housenumber"]["addr:street"]["building:levels"]${filter};out tags center;`
  return withRetry(
    `Overpass ${filter}`,
    () => http('POST', new URL('https://overpass-api.de/api/interpreter'), `data=${encodeURIComponent(q)}`),
    (b) => (JSON.parse(b) as { elements: OsmWay[] }).elements,
  )
}

/** Русские названия улиц (name:ru) для адресов, записанных в OSM по-казахски. */
async function russianStreetNames(names: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  // Точное совпадение имени (без регулярок): объединение запросов по каждой улице
  const ql = (n: string) => n.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const q = `[out:json][timeout:50][bbox:43.1,76.7,43.4,77.2];(${names.map((n) => `way["highway"]["name"="${ql(n)}"];`).join('')});out tags;`
  const ways = await withRetry(
    'Overpass улицы',
    () => http('POST', new URL('https://overpass-api.de/api/interpreter'), `data=${encodeURIComponent(q)}`),
    (b) => (JSON.parse(b) as { elements: { tags: Record<string, string> }[] }).elements,
  )
  for (const w of ways) {
    const ru = w.tags['name:ru']
    if (ru && !out.has(w.tags.name)) out.set(w.tags.name, ru)
  }
  return out
}

function parseYear(raw?: string): { year: number | null; approx: boolean } {
  if (!raw) return { year: null, approx: false }
  const s = raw.trim()
  const quarter = s.match(/^(\d{4})Q[1-4]$/)
  if (quarter) return { year: Number(quarter[1]), approx: false }
  const m = s.match(/^(~)?(\d{4})(?:-\d{2}(?:-\d{2})?)?$/)
  return m ? { year: Number(m[2]), approx: Boolean(m[1]) } : { year: null, approx: false }
}

async function district(lat: number, lon: number): Promise<string | null> {
  await sleep(1100) // политика Nominatim
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('accept-language', 'ru')
  url.searchParams.set('zoom', '18')
  const a = await withRetry('Nominatim reverse', () => http('GET', url), (b) => (JSON.parse(b) as { address?: Record<string, string> }).address)
  return a?.city_district?.replace(/\s*район$/i, '') ?? null
}

// ---------- Valhalla ----------
function decodePolyline6(str: string): [number, number][] {
  const coords: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < str.length) {
    for (const which of [0, 1]) {
      let result = 0
      let shift = 0
      let b: number
      do {
        b = str.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (which === 0) lat += delta
      else lng += delta
    }
    coords.push([Math.round(lng) / 1e6, Math.round(lat) / 1e6])
  }
  return coords
}

interface Maneuver {
  type: number
  instruction: string
  lengthM: number
  timeSec: number
  beginIndex: number
}

async function valhalla(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  await sleep(1100) // честное использование публичного сервера FOSSGIS
  const url = new URL('https://valhalla1.openstreetmap.de/route')
  url.searchParams.set(
    'json',
    JSON.stringify({
      locations: [
        { lat: from.lat, lon: from.lng },
        { lat: to.lat, lon: to.lng },
      ],
      costing: 'pedestrian',
      language: 'ru-RU',
      directions_options: { units: 'kilometers' },
    }),
  )
  return withRetry('Valhalla', () => http('GET', url), (b) => {
    const trip = (JSON.parse(b) as {
      trip: {
        summary: { length: number; time: number }
        legs: { shape: string; maneuvers: { type: number; instruction: string; length: number; time: number; begin_shape_index: number }[] }[]
      }
    }).trip
    const coordinates = trip.legs.flatMap((l, i) => {
      const c = decodePolyline6(l.shape)
      return i === 0 ? c : c.slice(1)
    })
    const maneuvers: Maneuver[] = trip.legs[0].maneuvers.map((m) => ({
      type: m.type,
      instruction: m.instruction,
      lengthM: Math.round(m.length * 1000),
      timeSec: Math.round(m.time),
      beginIndex: m.begin_shape_index,
    }))
    return { coordinates, lengthM: Math.round(trip.summary.length * 1000), timeSec: Math.round(trip.summary.time), maneuvers }
  })
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

async function main() {
  const points = (JSON.parse(readFileSync(POINTS, 'utf8')) as {
    id: string
    name: string
    lat: number | null
    lng: number | null
    needsReview: boolean
  }[]).filter((p) => !p.needsReview && p.lat !== null && p.lng !== null) as { id: string; name: string; lat: number; lng: number }[]

  console.log('Overpass: дома с годом постройки…')
  const withYear = await overpass('["start_date"]')
  console.log('Overpass: дома с материалом…')
  const withMaterial = (await overpass('["building:material"]')).filter((w) =>
    STRUCTURAL.test((w.tags['building:material'] ?? '').toLowerCase()),
  )

  // Отбор: по кругу из «корзин» эпох постройки → разнообразие для демо;
  // один адрес — один дом (в ЖК несколько корпусов с одним адресом);
  // дома не ближе 400 м друг к другу; в пешей доступности есть пункт.
  const CENTER = { lat: 43.238, lng: 76.945 }
  const bucketOf = (w: OsmWay) => {
    const { year } = parseYear(w.tags['start_date'] ?? w.tags['building:start_date'])
    if (year === null) return 'material'
    if (year < 1957) return 'до 1957'
    if (year <= 1981) return '1957–1981'
    if (year <= 2006) return '1982–2006'
    return 'после 2006'
  }
  const buckets = new Map<string, OsmWay[]>()
  const ids = new Set<number>()
  for (const w of [...withYear, ...withMaterial]) {
    if (ids.has(w.id)) continue
    ids.add(w.id)
    const levels = Number(w.tags['building:levels'])
    if (!(levels > 0 && levels <= 40)) continue
    const here = { lat: w.center.lat, lng: w.center.lon }
    const nearestPoint = Math.min(...points.map((p) => haversine(here, p)))
    if (nearestPoint > 2500) continue
    const key = bucketOf(w)
    buckets.set(key, [...(buckets.get(key) ?? []), w])
  }
  for (const list of buckets.values())
    list.sort((a, b) => haversine(CENTER, { lat: a.center.lat, lng: a.center.lon }) - haversine(CENTER, { lat: b.center.lat, lng: b.center.lon }))
  console.log('Кандидаты по эпохам:', [...buckets].map(([k, v]) => `${k}: ${v.length}`).join(', '))

  const addrKey = (w: OsmWay) => `${w.tags['addr:street']}|${w.tags['addr:housenumber']}`.toLowerCase().replace(/\s+/g, ' ')
  const picked: OsmWay[] = []
  const usedAddr = new Set<string>()
  const order = ['до 1957', '1957–1981', '1982–2006', 'после 2006', 'material']
  let progress = true
  while (picked.length < MAX_HOUSES && progress) {
    progress = false
    for (const key of order) {
      if (picked.length >= MAX_HOUSES) break
      const list = buckets.get(key) ?? []
      const idx = list.findIndex(
        (w) =>
          !usedAddr.has(addrKey(w)) &&
          picked.every((p) => haversine({ lat: p.center.lat, lng: p.center.lon }, { lat: w.center.lat, lng: w.center.lon }) >= 400),
      )
      if (idx === -1) continue
      const [w] = list.splice(idx, 1)
      picked.push(w)
      usedAddr.add(addrKey(w))
      progress = true
    }
  }
  console.log(`Выбрано домов: ${picked.length} (с годом: ${withYear.length}, с конструктивным материалом: ${withMaterial.length})`)

  const ruStreets = await russianStreetNames([...new Set(picked.map((w) => w.tags['addr:street']))])

  const houses = []
  for (const [i, w] of picked.entries()) {
    const t = w.tags
    const { year, approx } = parseYear(t['start_date'] ?? t['building:start_date'])
    const floors = Number(t['building:levels'])
    const here = { lat: w.center.lat, lng: w.center.lon }
    const dist = await district(here.lat, here.lng)

    const nearest = [...points].sort((a, b) => haversine(here, a) - haversine(here, b)).slice(0, 5)
    let best: (Awaited<ReturnType<typeof valhalla>> & { pointId: string }) | null = null
    for (const p of nearest) {
      try {
        const r = await valhalla(here, p)
        if (!best || r.timeSec < best.timeSec) best = { ...r, pointId: p.id }
      } catch {
        /* маршрут к этому пункту не построился — пропускаем */
      }
    }

    const street = t['addr:street']
    const streetRu = t['addr:street:ru'] ?? ruStreets.get(street) ?? street
    houses.push({
      id: `osm-way-${w.id}`,
      address: `${streetRu}, ${t['addr:housenumber']}`,
      addressKk: streetRu !== street ? `${street}, ${t['addr:housenumber']}` : undefined,
      district: dist,
      lat: Math.round(here.lat * 1e6) / 1e6,
      lng: Math.round(here.lng * 1e6) / 1e6,
      year,
      yearApprox: approx || undefined,
      floors: Number.isFinite(floors) && floors > 0 ? Math.round(floors) : null,
      material: t['building:material'] ?? null,
      series: t['building:series'] ?? null,
      source: 'OpenStreetMap',
      sourceRef: `way/${w.id}`,
      isDemo: true,
      route: best
        ? {
            pointId: best.pointId,
            timeSec: best.timeSec,
            lengthM: best.lengthM,
            coordinates: best.coordinates,
            maneuvers: best.maneuvers,
            provider: 'valhalla',
          }
        : null,
    })
    const pt = best ? points.find((p) => p.id === best!.pointId)?.name : '—'
    console.log(
      `${String(i + 1).padStart(2)}. ${streetRu}, ${t['addr:housenumber']} · ${dist ?? '?'} · ${t['building:levels']} эт · ${year ?? '—'} · → ${pt} ${best ? `${Math.round(best.timeSec / 60)} мин` : ''}`,
    )
  }

  writeFileSync(OUT, `${JSON.stringify(houses, null, 2)}\n`)
  console.log(`\nЗаписано: ${OUT}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
