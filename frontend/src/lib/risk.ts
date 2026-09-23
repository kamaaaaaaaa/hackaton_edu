import type { House, RiskLevel } from '@/api/types'
import type { HouseQuery } from '@/api/house'

// ДЕТЕРМИНИРОВАННАЯ эвристика оценки риска для демо.
// Реальных данных по зданиям Алматы у фронта нет, поэтому по адресу+координатам
// стабильно «выводим» этажность, год и тип, а из них — балл риска.
// Один и тот же адрес всегда даёт один и тот же результат (не «прыгает»).
// На проде это заменит ответ бэкенда GET /house/ (см. API_CONTRACT.md).

const BUILDING_TYPES = [
  'Панельный',
  'Кирпичный',
  'Монолитно-каркасный',
  'Каркасно-камышитовый',
  'Крупноблочный',
]

/** FNV-1a хеш строки → uint32. */
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function estimateHouse({ lat, lon, address }: HouseQuery): House {
  const seed = hash(`${address}|${lat.toFixed(4)}|${lon.toFixed(4)}`)

  // ВАЖНО: беззнаковый сдвиг >>>, иначе большой хеш даёт отрицательный индекс.
  const floors = 1 + (seed % 16) // 1..16
  const yearBuilt = 1955 + ((seed >>> 4) % 69) // 1955..2023
  const buildingType =
    BUILDING_TYPES[(seed >>> 9) % BUILDING_TYPES.length] ?? BUILDING_TYPES[0]

  // Балл риска: старый фонд, высокая этажность и хрупкие конструкции — выше.
  let score = 30
  if (yearBuilt < 1981)
    score += 28 // до актуализации сейсмонорм СНиП
  else if (yearBuilt < 2004) score += 14
  else score -= 6

  if (floors >= 9) score += 16
  else if (floors >= 5) score += 8

  if (buildingType === 'Каркасно-камышитовый') score += 22
  if (buildingType === 'Крупноблочный') score += 12
  if (buildingType === 'Монолитно-каркасный') score -= 14

  score += (seed % 11) - 5 // небольшой разброс ±5
  score = Math.max(6, Math.min(96, Math.round(score)))

  const risk: RiskLevel = score >= 66 ? 'high' : score >= 40 ? 'mid' : 'low'

  return {
    address,
    lat,
    lon,
    floors,
    yearBuilt,
    buildingType,
    risk,
    riskScore: score,
    riskReason: reasonRu(risk, yearBuilt, floors, buildingType),
    estimated: true,
  }
}

function reasonRu(risk: RiskLevel, year: number, floors: number, type: string): string {
  const age =
    year < 1981
      ? 'дом старше актуальных сейсмонорм'
      : year < 2004
        ? 'постройка переходного периода норм'
        : 'относительно новый дом'
  const height = floors >= 9 ? 'высокая этажность' : floors >= 5 ? 'средняя этажность' : 'малоэтажный'
  const base = `${age}, ${height}, ${type.toLowerCase()}`
  if (risk === 'high') return `Высокий риск: ${base}. Заранее продумай маршрут эвакуации.`
  if (risk === 'mid') return `Средний риск: ${base}. Держи наготове тревожный чемоданчик.`
  return `Низкий риск: ${base}. Всё равно знай ближайший пункт сбора.`
}
