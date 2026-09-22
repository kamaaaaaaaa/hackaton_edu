import type { Alert } from './types'
import { apiGet, config } from './client'

/**
 * Активная тревога (землетрясение), если есть.
 * В демо-режиме тревогу поднимает сам пользователь кнопкой
 * «Симулировать тревогу», поэтому здесь всегда null.
 * На реальном бэкенде это будет polling или websocket от МЧС/сенсоров.
 */
export async function getActiveAlert(signal?: AbortSignal): Promise<Alert | null> {
  if (config.useMocks) return null
  try {
    return await apiGet<Alert | null>('/alert/active/', undefined, signal)
  } catch {
    return null
  }
}
