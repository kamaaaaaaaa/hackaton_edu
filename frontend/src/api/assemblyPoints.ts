import type { AssemblyPoint, MappedPoint } from './types'
import { isMapped } from '@/lib/geo'
import raw from '@/data/assemblyPoints.json'

// Официальные пункты приёма населения — распоряжение акима г. Алматы
// от 28.11.2022 №123ө. Координаты — результат scripts/geocode-points.ts
// (OpenStreetMap Nominatim, строгие проверки); точки с needsReview на карте не показываются.
// Это не моки: данные статичны и лежат в сборке. Когда у бэкенда появится
// GET /assembly-points/ (см. API_CONTRACT.md), заменить источник здесь.

const all = raw as unknown as AssemblyPoint[]

/** Число пунктов в официальном распоряжении (полный список). */
export const OFFICIAL_TOTAL = 384

export function getAssemblyPoints(): AssemblyPoint[] {
  return all
}

/** Только пункты с подтверждёнными координатами. */
export function getMappedPoints(): MappedPoint[] {
  return all.filter(isMapped)
}

export function getPointById(id: string | null): AssemblyPoint | null {
  return id ? (all.find((p) => p.id === id) ?? null) : null
}

export function countDistricts(): number {
  return new Set(all.map((p) => p.district)).size
}
