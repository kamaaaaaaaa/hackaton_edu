import type { House } from './types'
import { apiGet, config, delay } from './client'
import { estimateHouse } from '@/lib/risk'

export interface HouseQuery {
  lat: number
  lon: number
  address: string
}

/**
 * Данные о доме и оценка риска по координатам/адресу.
 * В режиме моков — детерминированная эвристика (src/lib/risk.ts),
 * т.к. открытого реестра зданий Алматы у фронта нет.
 */
export async function getHouse(query: HouseQuery, signal?: AbortSignal): Promise<House> {
  if (config.useMocks) {
    await delay(280)
    return estimateHouse(query)
  }
  return apiGet<House>(
    '/house/',
    { lat: query.lat, lon: query.lon, address: query.address },
    signal,
  )
}
