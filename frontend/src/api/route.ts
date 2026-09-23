import type { LngLat, Maneuver, MappedPoint, RoutedPoint, WalkingRoute } from './types'
import { TomTomError, tomtomGet } from './tomtom'
import { ROUTING_PROVIDER } from './geoConfig'
import { nearestByStraightLine } from '@/lib/geo'
import { prettifyInstruction } from '@/lib/maneuver'

// Пешие маршруты. По умолчанию — Valhalla (OpenStreetMap, сервер FOSSGIS):
// пешеходный профиль, тротуары и дворы, пошаговые подсказки на русском.
// TomTom Routing (travelMode=pedestrian) — если VITE_ROUTING_PROVIDER=tomtom.

const VALHALLA = 'https://valhalla1.openstreetmap.de/route'

const same = (a: [number, number] | undefined, b: [number, number]) =>
  Boolean(a) && Math.abs(a![0] - b[0]) < 1e-7 && Math.abs(a![1] - b[1]) < 1e-7

/** Начало — точные координаты адреса, конец — точные координаты пункта. */
function anchor(coords: [number, number][], from: LngLat, to: LngLat): [number, number][] {
  const out = [...coords]
  const start: [number, number] = [from.lng, from.lat]
  const end: [number, number] = [to.lng, to.lat]
  if (!same(out[0], start)) out.unshift(start)
  if (!same(out[out.length - 1], end)) out.push(end)
  return out
}

/** Декодер polyline с точностью 6 знаков (формат Valhalla) → [lng, lat]. */
export function decodePolyline6(str: string): [number, number][] {
  const coords: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < str.length) {
    for (let which = 0; which < 2; which++) {
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
    coords.push([lng / 1e6, lat / 1e6])
  }
  return coords
}

interface ValhallaTrip {
  trip: {
    summary: { length: number; time: number }
    legs: {
      shape: string
      maneuvers: { type: number; instruction: string; length: number; time: number; begin_shape_index: number }[]
    }[]
  }
}

async function valhallaRoute(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<WalkingRoute> {
  const url = new URL(VALHALLA)
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
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Valhalla ${res.status}`)
  const { trip } = (await res.json()) as ValhallaTrip

  // Вся геометрия: участки по порядку, стык не дублируем
  const coords = trip.legs.flatMap((leg, i) => {
    const c = decodePolyline6(leg.shape)
    return i === 0 ? c : c.slice(1)
  })
  const shift = same(coords[0], [from.lng, from.lat]) ? 0 : 1 // anchor() добавит точку в начало
  const maneuvers: Maneuver[] = trip.legs[0].maneuvers.map((m) => ({
    type: m.type,
    instruction: prettifyInstruction(m.instruction),
    lengthM: Math.round(m.length * 1000),
    timeSec: Math.round(m.time),
    beginIndex: m.begin_shape_index + shift,
  }))
  return {
    coordinates: anchor(coords, from, to),
    lengthM: Math.round(trip.summary.length * 1000),
    timeSec: Math.round(trip.summary.time),
    maneuvers,
    provider: 'valhalla',
  }
}

interface TTRouteResponse {
  routes?: {
    summary: { lengthInMeters: number; travelTimeInSeconds: number }
    legs: { points: { latitude: number; longitude: number }[] }[]
  }[]
}

async function tomtomRoute(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<WalkingRoute> {
  const data = await tomtomGet<TTRouteResponse>(
    `/routing/1/calculateRoute/${from.lat},${from.lng}:${to.lat},${to.lng}/json`,
    { travelMode: 'pedestrian', routeType: 'fastest', traffic: false },
    signal,
  )
  const route = data.routes?.[0]
  if (!route) throw new TomTomError(404, 'Маршрут не найден')
  // ВСЯ геометрия всех участков; TomTom отдаёт {latitude, longitude} → [lng, lat]
  const coords: [number, number][] = []
  for (const leg of route.legs) {
    for (const p of leg.points) {
      const c: [number, number] = [p.longitude, p.latitude]
      if (!same(coords[coords.length - 1], c)) coords.push(c)
    }
  }
  return {
    coordinates: anchor(coords, from, to),
    lengthM: route.summary.lengthInMeters,
    timeSec: route.summary.travelTimeInSeconds,
    maneuvers: [],
    provider: 'tomtom',
  }
}

export function walkingRoute(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<WalkingRoute> {
  return ROUTING_PROVIDER === 'tomtom' ? tomtomRoute(from, to, signal) : valhallaRoute(from, to, signal)
}

export interface FastestResult {
  best: RoutedPoint
  /** Все успешно посчитанные кандидаты, по возрастанию времени. */
  candidates: RoutedPoint[]
  failed: number
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Ближайший пункт по реальному времени пешком: N ближайших по прямой →
 * пеший маршрут до каждого → минимальное время в пути.
 */
export async function findFastestPoint(
  from: LngLat,
  points: MappedPoint[],
  signal?: AbortSignal,
  n = 5,
): Promise<FastestResult> {
  const nearest = nearestByStraightLine(from, points, n)
  const settled = await Promise.allSettled(
    nearest.map(async (c, i) => {
      await pause(i * 150) // бережём публичный сервер
      const route = await walkingRoute(from, c.point, signal)
      return { point: c.point, straightM: c.straightM, route }
    }),
  )
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError')

  const ok = settled
    .filter((r): r is PromiseFulfilledResult<RoutedPoint> => r.status === 'fulfilled')
    .map((r) => r.value)
    .sort((a, b) => a.route.timeSec - b.route.timeSec)

  if (!ok.length) {
    const reason = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined
    throw reason?.reason ?? new Error('Маршруты не построены')
  }
  return { best: ok[0], candidates: ok, failed: settled.length - ok.length }
}
