// Единые типы данных фронтенда. Это же — контракт с бэкендом
// (см. frontend/API_CONTRACT.md). Меняешь тип — синхронизируй контракт.
//
// Правило проекта: никаких выдуманных данных. Нет значения — null,
// в интерфейсе показывается «нет данных».

export type RiskLevel = 'low' | 'mid' | 'high'

export interface LngLat {
  lng: number
  lat: number
}

export type AssemblyPointType =
  | 'school'
  | 'kindergarten'
  | 'university'
  | 'college'
  | 'stadium'
  | 'arena'

export type GeocodeMethod =
  | 'address'
  | 'address+poi'
  | 'poi-address-match'
  /** Координаты объекта OSM с тем же номером/названием в том же районе (scripts/apply-osm-objects.ts). */
  | 'osm-object'
  | 'review'
  | 'pending'

/** Официальный пункт приёма населения (распоряжение акима №123ө). */
export interface AssemblyPoint {
  id: string
  district: string
  name: string
  address: string
  /** null — координаты не подтверждены геокодером (needsReview). */
  lat: number | null
  lng: number | null
  type: AssemblyPointType
  source: string
  /** Уверенность геокодера 0..1 (TomTom её отдаёт, Nominatim — нет → null). */
  geocodeConfidence: number | null
  /** true — адрес не удалось уверенно геокодировать: на карте точку не рисуем. */
  needsReview: boolean
  geocodeMethod?: GeocodeMethod
  geocodeNote?: string
}

/** Пункт с подтверждёнными координатами — только такие попадают на карту. */
export type MappedPoint = AssemblyPoint & { lat: number; lng: number }

/** Дом пользователя. Всё неизвестное — null. */
export interface House {
  address: string
  lat: number
  lng: number
  year: number | null
  /** true — в источнике год указан приблизительно («~1975»). */
  yearApprox?: boolean
  floors: number | null
  /** Материал как в источнике (например, OSM building:material). */
  material: string | null
  series: string | null
  source: 'openstreetmap' | 'demo' | null
  /** Район города (если известен). */
  district?: string | null
  /** Ссылка на объект источника, например «way/123456». */
  sourceRef: string | null
  /** true — дом из подготовленного списка (данные OSM проверены, есть ИИ-разбор). */
  isDemo: boolean
  /** id дома из списка src/data/demoHouses.json. */
  houseId?: string
}

export type FamilyStatus = 'safe' | 'no_contact' | 'unknown'

/** Член семейного круга. */
export interface FamilyMember {
  id: string
  name: string
  phone: string
  isSelf?: boolean
  status: FamilyStatus
  updatedAt: string
}

/** Событие тревоги (землетрясение). */
export interface Alert {
  id: string
  active: boolean
  startedAt: string
  title: string
  message: string
  magnitude?: number
  source: 'demo' | 'mchs' | 'sensor'
  recommendedPointId?: string
}

/** Подсказка поиска адреса. */
export interface AddressSuggestion {
  id: string
  title: string
  subtitle: string
  district: string | null
  lat: number
  lng: number
  /** Тип результата из API (Point Address, Street, POI…). */
  kind: string
  source: 'demo' | 'tomtom' | 'photon' | 'nominatim' | 'geolocation' | 'map'
  /** Для демо-домов — id дома из списка (данные и ИИ-разбор уже есть). */
  houseId?: string
}

/** Шаг маршрута («через 120 м поверните направо»). */
export interface Maneuver {
  /** Тип манёвра Valhalla (1 старт, 10 направо, 15 налево, 4 финиш…). */
  type: number
  instruction: string
  lengthM: number
  timeSec: number
  /** Индекс точки геометрии, с которой начинается шаг. */
  beginIndex: number
}

/** Пеший маршрут. Геометрия — [lng, lat] от точного адреса до точного пункта. */
export interface WalkingRoute {
  coordinates: [number, number][]
  lengthM: number
  timeSec: number
  /** Пошаговые подсказки (могут быть пустыми у провайдера без инструкций). */
  maneuvers: Maneuver[]
  /** valhalla / tomtom — живой расчёт; cache — маршрут, посчитанный заранее. */
  provider: 'valhalla' | 'tomtom' | 'cache'
}

/** Пункт-кандидат с реальным пешим маршрутом. */
export interface RoutedPoint {
  point: MappedPoint
  /** Расстояние по прямой — только для отбора кандидатов. */
  straightM: number
  route: WalkingRoute
}
