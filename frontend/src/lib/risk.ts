import type { House, RiskLevel } from '@/api/types'
import type { TranslationKey } from '@/i18n/ru'

// Прозрачная предварительная оценка риска здания. НЕ официальное заключение.
// Считаем только по известным полям — ничего не угадываем:
//   год постройки: до 1957 (до первых сейсмонорм) +3 · 1957–1981 +2 · 1982–2006 +1 · позже 0
//   материал:      кирпич/камень/саман +2 · панель/блок +1 · монолит/каркас 0
//   этажность:     больше 9 этажей +1 (эвакуация дольше, лифт запрещён)
//   уровень:       0–1 низкий · 2–3 средний · 4+ высокий
// Нет ни года, ни материала → «недостаточно данных», уровень не выставляем.

export type FactorKey = 'year' | 'material' | 'floors'

export interface RiskFactor {
  key: FactorKey
  /** Значение из данных — как показать пользователю; null — нет данных. */
  value: string | null
  /** Баллы; null — фактор не учитывается. */
  points: number | null
  /** Пояснение категории (ключ словаря); null — нет данных. */
  labelKey: TranslationKey | null
}

export interface RiskAssessment {
  /** null — недостаточно данных для оценки. */
  level: RiskLevel | null
  score: number | null
  /** Максимально возможный балл по формуле — для шкалы. */
  maxScore: number
  factors: RiskFactor[]
}

export const RISK_MAX_SCORE = 6

type MaterialClass = 'masonry' | 'panel' | 'frame' | 'other'

/** Материал из OSM (building:material) или данных команды → класс формулы. */
export function classifyMaterial(raw: string): MaterialClass {
  const m = raw.trim().toLowerCase()
  if (/^(brick|stone|adobe|mud|clay|masonry|cob|rammed_earth)$/.test(m) || /(кирпич|камен|саман)/.test(m))
    return 'masonry'
  if (/(panel|block|prefab)/.test(m) || /(панел|блок)/.test(m)) return 'panel'
  if (/^(reinforced_concrete|concrete|steel|metal)$/.test(m) || /(монолит|каркас|железобетон)/.test(m))
    return 'frame'
  return 'other'
}

function yearFactor(year: number | null, approx?: boolean): RiskFactor {
  if (year === null) return { key: 'year', value: null, points: null, labelKey: null }
  const value = `${approx ? '≈' : ''}${year}`
  if (year < 1957) return { key: 'year', value, points: 3, labelKey: 'house.factor.year.pre1957' }
  if (year <= 1981) return { key: 'year', value, points: 2, labelKey: 'house.factor.year.1957' }
  if (year <= 2006) return { key: 'year', value, points: 1, labelKey: 'house.factor.year.1982' }
  return { key: 'year', value, points: 0, labelKey: 'house.factor.year.post2006' }
}

function materialFactor(material: string | null): RiskFactor {
  if (!material) return { key: 'material', value: null, points: null, labelKey: null }
  const cls = classifyMaterial(material)
  if (cls === 'masonry')
    return { key: 'material', value: material, points: 2, labelKey: 'house.factor.material.masonry' }
  if (cls === 'panel')
    return { key: 'material', value: material, points: 1, labelKey: 'house.factor.material.panel' }
  if (cls === 'frame')
    return { key: 'material', value: material, points: 0, labelKey: 'house.factor.material.frame' }
  return { key: 'material', value: material, points: null, labelKey: 'house.factor.material.other' }
}

function floorsFactor(floors: number | null): RiskFactor {
  if (floors === null) return { key: 'floors', value: null, points: null, labelKey: null }
  return floors > 9
    ? { key: 'floors', value: String(floors), points: 1, labelKey: 'house.factor.floors.high' }
    : { key: 'floors', value: String(floors), points: 0, labelKey: 'house.factor.floors.normal' }
}

export function assessRisk(house: Pick<House, 'year' | 'yearApprox' | 'material' | 'floors'>): RiskAssessment {
  const factors = [
    yearFactor(house.year, house.yearApprox),
    materialFactor(house.material),
    floorsFactor(house.floors),
  ]
  const [year, material] = factors
  const enough = year.points !== null || material.points !== null
  if (!enough) return { level: null, score: null, maxScore: RISK_MAX_SCORE, factors }

  const score = factors.reduce((sum, f) => sum + (f.points ?? 0), 0)
  const level: RiskLevel = score <= 1 ? 'low' : score <= 3 ? 'mid' : 'high'
  return { level, score, maxScore: RISK_MAX_SCORE, factors }
}
