/**
 * Пересчёт запасных маршрутов для домов из списка — node scripts/refresh-house-routes.ts
 *
 * Нужен, когда в src/data/assemblyPoints.json появились новые подтверждённые
 * пункты: для каждого дома строим пешие маршруты Valhalla (OSM) к 5 ближайшим
 * по прямой пунктам и сохраняем самый быстрый. Остальные поля дома не трогаем.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { request } from 'node:https'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const HOUSES = `${ROOT}src/data/demoHouses.json`
const POINTS = `${ROOT}src/data/assemblyPoints.json`
const UA = 'gotov-k-tolchku/0.2 (hackathon MVP; demo houses)'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function get(url: URL): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (c: string) => (data += c))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }))
    })
    req.on('error', reject)
    req.setTimeout(60000, () => req.destroy(new Error('timeout')))
    req.end()
  })
}

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

async function valhalla(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
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
  for (let attempt = 1; attempt <= 5; attempt++) {
    await sleep(1100 * attempt) // бережём публичный сервер FOSSGIS
    try {
      const res = await get(url)
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
      const trip = (JSON.parse(res.body) as {
        trip: {
          summary: { length: number; time: number }
          legs: { shape: string; maneuvers: { type: number; instruction: string; length: number; time: number; begin_shape_index: number }[] }[]
        }
      }).trip
      return {
        coordinates: trip.legs.flatMap((l, i) => (i === 0 ? decodePolyline6(l.shape) : decodePolyline6(l.shape).slice(1))),
        lengthM: Math.round(trip.summary.length * 1000),
        timeSec: Math.round(trip.summary.time),
        maneuvers: trip.legs[0].maneuvers.map((m) => ({
          type: m.type,
          instruction: m.instruction,
          lengthM: Math.round(m.length * 1000),
          timeSec: Math.round(m.time),
          beginIndex: m.begin_shape_index,
        })),
      }
    } catch (e) {
      console.log(`  Valhalla: ${(e as Error).message}, повтор ${attempt}`)
    }
  }
  return null
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

const points = (JSON.parse(readFileSync(POINTS, 'utf8')) as { id: string; name: string; lat: number | null; lng: number | null; needsReview: boolean }[])
  .filter((p) => !p.needsReview && p.lat !== null && p.lng !== null) as { id: string; name: string; lat: number; lng: number }[]
const houses = JSON.parse(readFileSync(HOUSES, 'utf8')) as {
  id: string
  address: string
  lat: number
  lng: number
  route: { pointId: string; timeSec: number; lengthM: number } | null
}[]

for (const h of houses) {
  const nearest = [...points].sort((a, b) => haversine(h, a) - haversine(h, b)).slice(0, 5)
  let best: { pointId: string; timeSec: number; lengthM: number; coordinates: [number, number][]; maneuvers: unknown[] } | null = null
  for (const p of nearest) {
    const r = await valhalla(h, p)
    if (r && (!best || r.timeSec < best.timeSec)) best = { ...r, pointId: p.id }
  }
  if (!best) {
    console.log(`✗ ${h.address}: маршруты не построены — оставляем прежний`)
    continue
  }
  const before = h.route ? `${h.route.pointId} ${Math.round(h.route.timeSec / 60)} мин` : '—'
  h.route = { ...best, provider: 'valhalla' } as typeof h.route
  const name = points.find((p) => p.id === best!.pointId)?.name
  console.log(`${before === `${best.pointId} ${Math.round(best.timeSec / 60)} мин` ? '=' : '→'} ${h.address}: было ${before}, стало ${best.pointId} (${name}) ${Math.round(best.timeSec / 60)} мин ${best.lengthM} м`)
}

writeFileSync(HOUSES, `${JSON.stringify(houses, null, 2)}\n`)
console.log('\nЗаписано:', HOUSES)
