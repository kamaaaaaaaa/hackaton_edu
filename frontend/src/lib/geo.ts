import type { AssemblyPoint, LngLat, MappedPoint } from '@/api/types'

const EARTH_R = 6371000
const toRad = (deg: number) => (deg * Math.PI) / 180

/** Центр Алматы — стартовая точка карты и центр поиска. */
export const ALMATY_CENTER: LngLat = { lat: 43.238, lng: 76.945 }

/** Расстояние по прямой (большой круг), метры. */
export function haversine(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Только пункты с подтверждёнными координатами. */
export function isMapped(p: AssemblyPoint): p is MappedPoint {
  return !p.needsReview && p.lat !== null && p.lng !== null
}

/** N ближайших по прямой — только для отбора кандидатов на маршрут. */
export function nearestByStraightLine(
  from: LngLat,
  points: MappedPoint[],
  n: number,
): { point: MappedPoint; straightM: number }[] {
  return points
    .map((point) => ({ point, straightM: haversine(from, point) }))
    .sort((a, b) => a.straightM - b.straightM)
    .slice(0, n)
}

/** Границы набора [lng, lat] в формате MapLibre: [[west, south], [east, north]]. */
export function boundsOf(coords: [number, number][]): [[number, number], [number, number]] {
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const [lng, lat] of coords) {
    if (lng < w) w = lng
    if (lng > e) e = lng
    if (lat < s) s = lat
    if (lat > n) n = lat
  }
  return [
    [w, s],
    [e, n],
  ]
}
