// Транспорт TomTom. Весь доступ к TomTom — только через src/api/*.
// Бэкенд своих эндпоинтов поиска/маршрутов пока не имеет (см. API_CONTRACT.md) —
// когда появятся, достаточно заменить вызовы здесь и в search/route/reverse.

export const TOMTOM_KEY = (import.meta.env.VITE_TOMTOM_KEY ?? '').trim()
const BASE = 'https://api.tomtom.com'

/** Центр и радиус поиска — город Алматы. */
export const ALMATY_BIAS = { lat: 43.238, lon: 76.945, radius: 25000 } as const

export class TomTomError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'TomTomError'
  }
}

export function isAbort(e: unknown): boolean {
  return (e as { name?: string } | null)?.name === 'AbortError'
}

export async function tomtomGet<T>(
  path: string,
  params: Record<string, string | number | boolean>,
  signal?: AbortSignal,
): Promise<T> {
  if (!TOMTOM_KEY) throw new TomTomError(0, 'VITE_TOMTOM_KEY не задан')
  const url = new URL(BASE + path)
  url.searchParams.set('key', TOMTOM_KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) {
    if (res.status === 403) {
      // Подсказка разработчику: у ключа не включён нужный продукт TomTom
      console.warn(`[TomTom] 403 на ${path.split('/').slice(0, 3).join('/')}: включите продукт для ключа`)
    }
    throw new TomTomError(res.status, `TomTom ${res.status}`)
  }
  return (await res.json()) as T
}
