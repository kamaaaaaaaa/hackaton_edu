import { useSyncExternalStore } from 'react'
import type { House } from '@/api/types'
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage'

// Выбранный адрес и данные о здании — чтобы карта восстанавливалась
// при возврате на экран и после перезагрузки.

export interface SelectedPlace {
  label: string
  subtitle: string
  district: string | null
  lat: number
  lng: number
  /** Дом из списка src/data/demoHouses.json — данные и маршрут уже есть. */
  houseId?: string
}

interface HouseState {
  place: SelectedPlace | null
  house: House | null
}

let state: HouseState = readJSON<HouseState>(STORAGE_KEYS.house, { place: null, house: null })
// Старый формат (до редизайна) хранил дом без place — не восстанавливаем его.
if (!state || typeof state !== 'object' || !('place' in state)) state = { place: null, house: null }

const listeners = new Set<() => void>()

export function setSelected(next: Partial<HouseState>) {
  state = { ...state, ...next }
  writeJSON(STORAGE_KEYS.house, state)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getState = () => state

export function useSelected(): HouseState {
  return useSyncExternalStore(subscribe, getState, getState)
}
