import type { AssemblyPoint } from './types'
import { apiGet, config, delay } from './client'
import rawPoints from '@/mocks/assemblyPoints.json'

const mockPoints = rawPoints as unknown as AssemblyPoint[]

/** Список пунктов сбора. Моки — src/mocks/assemblyPoints.json. */
export async function getAssemblyPoints(signal?: AbortSignal): Promise<AssemblyPoint[]> {
  if (config.useMocks) {
    await delay(200)
    return mockPoints
  }
  return apiGet<AssemblyPoint[]>('/assembly-points/', undefined, signal)
}
