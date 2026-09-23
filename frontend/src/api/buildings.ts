import type { LngLat } from './types'
import { isAbort } from './tomtom'
import { normalizeHouseNumber } from '@/lib/addressNormalize'

// Этажность, год постройки, материал и серия здания из OpenStreetMap (Overpass API).
// Берём ТОЛЬКО здание, чей контур содержит точку адреса, либо здание рядом
// с тем же номером дома. Иначе — null («нет данных»), ничего не угадываем.
//
// Публичные серверы Overpass бывают перегружены, поэтому спрашиваем несколько
// параллельно и берём первый успешный ответ; каждому — жёсткий таймаут.

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const TIMEOUT_MS = 9000

interface OverpassElement {
  type: 'way' | 'relation'
  id: number
  tags?: Record<string, string>
  geometry?: { lat: number; lon: number }[]
  members?: { role: string; geometry?: { lat: number; lon: number }[] }[]
}

export interface BuildingData {
  year: number | null
  yearApprox: boolean
  floors: number | null
  material: string | null
  series: string | null
  ref: string
}

/** Все серверы OpenStreetMap не ответили — это не то же самое, что «здания нет». */
export class OsmUnavailableError extends Error {
  constructor() {
    super('OpenStreetMap (Overpass) недоступен')
    this.name = 'OsmUnavailableError'
  }
}

type Ring = [number, number][]

function ringsOf(el: OverpassElement): Ring[] {
  if (el.type === 'way' && el.geometry) return [el.geometry.map((g) => [g.lon, g.lat])]
  if (el.type === 'relation' && el.members) {
    return el.members
      .filter((m) => m.role === 'outer' && m.geometry)
      .map((m) => m.geometry!.map((g) => [g.lon, g.lat] as [number, number]))
  }
  return []
}

/** Точка внутри многоугольника (ray casting). */
function inRing(p: LngLat, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** «1975», «1975-06», «~1975» → год; «1970s», «C20» → null (слишком неточно). */
function parseYear(raw: string | undefined): { year: number | null; approx: boolean } {
  if (!raw) return { year: null, approx: false }
  const quarter = raw.trim().match(/^(\d{4})Q[1-4]$/) // «2021Q3» — квартал сдачи
  if (quarter) return { year: Number(quarter[1]), approx: false }
  const m = raw.trim().match(/^(~)?(\d{4})(?:-\d{2}(?:-\d{2})?)?$/)
  if (!m) return { year: null, approx: false }
  return { year: Number(m[2]), approx: Boolean(m[1]) }
}

function parseFloors(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 200 ? Math.round(n) : null
}

function toBuilding(el: OverpassElement): BuildingData {
  const t = el.tags ?? {}
  const { year, approx } = parseYear(t['start_date'] ?? t['building:start_date'] ?? t['construction_date'])
  return {
    year,
    yearApprox: approx,
    floors: parseFloors(t['building:levels']),
    material: t['building:material'] ?? null,
    series: t['building:series'] ?? null,
    ref: `${el.type}/${el.id}`,
  }
}

async function queryEndpoint(
  endpoint: string,
  query: string,
  parent: AbortController,
): Promise<OverpassElement[]> {
  const ctrl = new AbortController()
  const onParentAbort = () => ctrl.abort()
  parent.signal.addEventListener('abort', onParentAbort, { once: true })
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ data: query }), signal: ctrl.signal })
    if (!res.ok) throw new Error(`Overpass ${res.status}`)
    const { elements = [] } = (await res.json()) as { elements?: OverpassElement[] }
    return elements
  } finally {
    window.clearTimeout(timer)
    parent.signal.removeEventListener('abort', onParentAbort)
  }
}

export async function findBuilding(
  p: LngLat,
  houseNumber: string | null,
  signal?: AbortSignal,
): Promise<BuildingData | null> {
  const query =
    `[out:json][timeout:10];(` +
    `way(around:30,${p.lat},${p.lng})["building"];` +
    `relation(around:30,${p.lat},${p.lng})["building"];` +
    `);out tags geom;`

  // Общий контроллер: отмена снаружи или первый успешный ответ гасят остальные запросы
  const race = new AbortController()
  const onAbort = () => race.abort()
  signal?.addEventListener('abort', onAbort, { once: true })

  let elements: OverpassElement[]
  try {
    elements = await Promise.any(ENDPOINTS.map((ep) => queryEndpoint(ep, query, race)))
  } catch (e) {
    if (signal?.aborted || isAbort(e)) throw new DOMException('aborted', 'AbortError')
    throw new OsmUnavailableError()
  } finally {
    race.abort()
    signal?.removeEventListener('abort', onAbort)
  }

  const containing = elements.find((el) => ringsOf(el).some((ring) => inRing(p, ring)))
  if (containing) return toBuilding(containing)

  const wanted = normalizeHouseNumber(houseNumber)
  if (wanted) {
    const byNumber = elements.find((el) => normalizeHouseNumber(el.tags?.['addr:housenumber']) === wanted)
    if (byNumber) return toBuilding(byNumber)
  }
  return null
}
