import { useCallback, useEffect, useState } from 'react'
import type { House } from '@/api/types'
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage'

/** Последний выбранный дом. Персистится, чтобы тревога/маршрут работали между экранами. */
export function useSelectedHouse() {
  const [house, setHouse] = useState<House | null>(() =>
    readJSON<House | null>(STORAGE_KEYS.house, null),
  )

  useEffect(() => {
    if (house) writeJSON(STORAGE_KEYS.house, house)
  }, [house])

  const clear = useCallback(() => {
    setHouse(null)
    writeJSON<House | null>(STORAGE_KEYS.house, null)
  }, [])

  return { house, setHouse, clear }
}

export function readStoredHouse(): House | null {
  return readJSON<House | null>(STORAGE_KEYS.house, null)
}
