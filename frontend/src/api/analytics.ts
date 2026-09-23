// Аналитика использования (см. frontend/API_CONTRACT.md, /analytics/...).
// trackEvent — fire-and-forget: никогда не бросает и не блокирует вызывающий
// код, чтобы упавший трекинг не ломал пользовательский сценарий.

import { config, ApiError } from './client'

export interface AnalyticsSummary {
  totalEvents: number
  byEventType: Record<string, number>
  last24h: number
  generatedAt: string
}

/** Отправить событие аналитики. Не await'ится в местах вызова, ошибки глотает сама. */
export function trackEvent(event: string, meta?: object): void {
  if (!config.apiUrl) return
  fetch(`${config.apiUrl}/analytics/track/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(meta !== undefined ? { event, meta } : { event }),
  }).catch(() => undefined)
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  if (!config.apiUrl) {
    throw new ApiError(0, 'VITE_API_URL не задан. Укажи адрес бэкенда в .env.')
  }
  let res: Response
  try {
    res = await fetch(`${config.apiUrl}/analytics/summary/`, {
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new ApiError(0, 'Не удалось подключиться к серверу. Проверьте интернет-соединение.')
  }
  if (!res.ok) {
    throw new ApiError(res.status, `GET /analytics/summary/ → ${res.status}`)
  }
  return (await res.json()) as AnalyticsSummary
}
