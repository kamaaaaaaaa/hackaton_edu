import { useSyncExternalStore } from 'react'
import type { Maneuver, WalkingRoute } from '@/api/types'
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage'

// План эвакуации: последний построенный маршрут. Хранится на устройстве —
// доступен офлайн, в режиме тревоги и в учебной тревоге.

export interface EvacuationPlan {
  from: { label: string; lat: number; lng: number }
  to: { id: string; name: string; address: string; district: string; lat: number; lng: number }
  /** Геометрия маршрута [lng, lat] */
  coordinates: [number, number][]
  timeSec: number
  lengthM: number
  /** Пошаговые подсказки (в старых сохранённых планах их нет) */
  maneuvers?: Maneuver[]
  /** Кто посчитал маршрут: valhalla / tomtom — живой расчёт, cache — заранее */
  provider?: WalkingRoute['provider']
  /** Сравнённые кандидаты (для прозрачности выбора) */
  candidates: { id: string; name: string; timeSec: number; lengthM: number }[]
  savedAt: string
}

let current: EvacuationPlan | null = readJSON<EvacuationPlan | null>(STORAGE_KEYS.plan, null)
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function savePlan(plan: EvacuationPlan) {
  current = plan
  writeJSON(STORAGE_KEYS.plan, plan)
  emit()
}

export function readPlan(): EvacuationPlan | null {
  return current
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Реактивный доступ к плану из любого экрана. */
export function usePlan(): EvacuationPlan | null {
  return useSyncExternalStore(subscribe, readPlan, readPlan)
}
