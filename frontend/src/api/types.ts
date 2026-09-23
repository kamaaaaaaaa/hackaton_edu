// Единые типы данных фронтенда. Это же — контракт с бэкендом
// (см. frontend/API_CONTRACT.md). Меняешь тип — синхронизируй контракт.

export type RiskLevel = 'low' | 'mid' | 'high'

export interface LatLng {
  lat: number
  lon: number
}

/** Открытая площадка для сбора / эвакуации (парк, стадион, площадь). */
export interface AssemblyPoint {
  id: string
  name: string
  type: 'park' | 'stadium' | 'square' | 'field' | 'schoolyard' | 'other'
  district?: string
  address?: string
  lat: number
  lon: number
  /** Ориентировочная вместимость, человек. */
  capacity?: number
}

/** Дом пользователя и оценка сейсмического риска. */
export interface House {
  id?: string
  address: string
  lat: number
  lon: number
  /** Этажность. null — неизвестно. */
  floors: number | null
  /** Год постройки. null — неизвестно. */
  yearBuilt: number | null
  /** Тип конструкции (панель, кирпич, монолит…). */
  buildingType?: string
  risk: RiskLevel
  /** Балл риска 0..100 для шкалы/прогресса. */
  riskScore: number
  /** Короткое пояснение, почему такой риск (человекочитаемое). */
  riskReason: string
  /** true — оценка эвристикой на фронте (реальных данных по зданию нет). */
  estimated: boolean
}

export type FamilyStatus = 'safe' | 'no_contact' | 'unknown'

/** Член семейного круга. */
export interface FamilyMember {
  id: string
  name: string
  phone: string
  /** true — карточка самого пользователя («Вы»). */
  isSelf?: boolean
  status: FamilyStatus
  /** ISO-время последнего обновления статуса. */
  updatedAt: string
}

/** Событие тревоги (землетрясение). */
export interface Alert {
  id: string
  active: boolean
  /** ISO-время начала. */
  startedAt: string
  title: string
  message: string
  /** Магнитуда, если известна. */
  magnitude?: number
  /** Источник события. */
  source: 'demo' | 'mchs' | 'sensor'
  /** id рекомендованного пункта сбора, если рассчитан. */
  recommendedPointId?: string
}
