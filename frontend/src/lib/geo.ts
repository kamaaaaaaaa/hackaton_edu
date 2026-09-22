import type { AssemblyPoint, LatLng } from '@/api/types'

const EARTH_R = 6371000 // метров
const toRad = (deg: number) => (deg * Math.PI) / 180

/** Средняя скорость пешехода, м/с (~4.9 км/ч). */
const WALK_SPEED_MPS = 1.35
/** Коэффициент «извилистости» реального маршрута к прямой линии. */
const DETOUR_FACTOR = 1.3

/** Расстояние по прямой (большой круг), метры. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export interface RankedPoint {
  point: AssemblyPoint
  /** Расстояние по прямой, метры. */
  distanceM: number
  /** Оценка времени пешком, минуты (с учётом извилистости). */
  walkMinutes: number
}

function rank(from: LatLng, p: AssemblyPoint): RankedPoint {
  const distanceM = haversine(from, { lat: p.lat, lon: p.lon })
  const walkMinutes = Math.max(1, Math.round((distanceM * DETOUR_FACTOR) / WALK_SPEED_MPS / 60))
  return { point: p, distanceM, walkMinutes }
}

/** Ближайший пункт сбора к точке. */
export function nearestPoint(from: LatLng, points: AssemblyPoint[]): RankedPoint | null {
  let best: RankedPoint | null = null
  for (const p of points) {
    const r = rank(from, p)
    if (!best || r.distanceM < best.distanceM) best = r
  }
  return best
}

/** Все пункты, отсортированные по возрастанию расстояния. */
export function rankByDistance(from: LatLng, points: AssemblyPoint[]): RankedPoint[] {
  return points.map((p) => rank(from, p)).sort((a, b) => a.distanceM - b.distanceM)
}

/** Человекочитаемое расстояние: «320 м» / «1.4 км». */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} м`
  const km = meters / 1000
  return `${km.toFixed(km < 10 ? 1 : 0)} км`
}

/** Центр Алматы — стартовая точка карты. */
export const ALMATY_CENTER: LatLng = { lat: 43.238949, lon: 76.889709 }
