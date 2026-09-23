import type { House, LngLat, Maneuver, WalkingRoute } from './types'
import { haversine } from '@/lib/geo'
import { prettifyInstruction } from '@/lib/maneuver'
import housesRaw from '@/data/demoHouses.json'
import analysesRaw from '@/data/houseAnalyses.json'

// Демо-дома: реальные жилые дома Алматы из OpenStreetMap (скрипт
// scripts/build-houses.ts) — этажность, год, материал со ссылкой way/ID,
// плюс заранее посчитанный пеший маршрут (Valhalla) на случай, если живой
// расчёт недоступен. ИИ-разбор — src/data/houseAnalyses.json.

export interface CachedRoute {
  pointId: string
  timeSec: number
  lengthM: number
  coordinates: [number, number][]
  maneuvers: Maneuver[]
  provider: string
}

export interface DemoHouse {
  id: string
  /** Адрес по-русски (улица — name:ru из OSM). */
  address: string
  /** Адрес как в OSM, если он записан по-казахски. */
  addressKk?: string
  district: string | null
  lat: number
  lng: number
  year: number | null
  yearApprox?: boolean
  floors: number | null
  material: string | null
  series: string | null
  source: string
  sourceRef: string
  isDemo: boolean
  route: CachedRoute | null
}

/** ИИ-разбор дома: интерпретация открытых данных, не официальное заключение. */
export interface HouseAnalysis {
  summary: string
  actions: string[]
  /** На каких данных основан разбор. */
  basis: string[]
  model: string
  generatedAt: string
}

const houses = (housesRaw as unknown as DemoHouse[]).filter((h) => typeof h.lat === 'number' && h.address)
const analyses = analysesRaw as unknown as Record<string, HouseAnalysis>

export function getDemoHouses(): DemoHouse[] {
  return houses
}

export function getDemoHouse(id: string | null | undefined): DemoHouse | null {
  return id ? (houses.find((h) => h.id === id) ?? null) : null
}

/** Демо-дом в радиусе maxM метров от точки (выбор на карте, поиск). */
export function findDemoHouseNear(p: LngLat, maxM = 30): DemoHouse | null {
  let best: DemoHouse | null = null
  let bestD = maxM
  for (const h of houses) {
    const d = haversine(p, h)
    if (d <= bestD) {
      best = h
      bestD = d
    }
  }
  return best
}

export function getHouseAnalysis(id: string | null | undefined): HouseAnalysis | null {
  // Живой ИИ-разбор для любого адреса — POST /api/ai/house-analysis/ (см. API_CONTRACT.md);
  // для демо-домов разбор подготовлен заранее и лежит в src/data/houseAnalyses.json.
  return id ? (analyses[id] ?? null) : null
}

export function toHouse(d: DemoHouse): House {
  return {
    address: d.address,
    lat: d.lat,
    lng: d.lng,
    year: d.year,
    yearApprox: d.yearApprox,
    floors: d.floors,
    material: d.material,
    series: d.series,
    source: 'openstreetmap',
    district: d.district,
    houseId: d.id,
    sourceRef: d.sourceRef,
    isDemo: true,
  }
}

/** Маршрут, посчитанный заранее (для демо-дома), в формате живого маршрута. */
export function cachedRoute(houseId: string | null | undefined): (WalkingRoute & { pointId: string }) | null {
  const r = getDemoHouse(houseId)?.route
  if (!r) return null
  return {
    pointId: r.pointId,
    coordinates: r.coordinates,
    lengthM: r.lengthM,
    timeSec: r.timeSec,
    maneuvers: r.maneuvers.map((m) => ({ ...m, instruction: prettifyInstruction(m.instruction) })),
    provider: 'cache',
  }
}
