// Тонкий HTTP-клиент + флаги окружения. Весь доступ к данным идёт
// через модули api/*, которые сами выбирают: моки или реальный бэкенд.

const useMocks = (import.meta.env.VITE_USE_MOCKS ?? 'true').toString().toLowerCase() !== 'false'
const apiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export const config = {
  /** true — берём данные из src/mocks, бэкенд не нужен. */
  useMocks,
  /** Базовый URL реального API (без хвостового слэша). */
  apiUrl,
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Небольшая искусственная задержка для моков — чтобы честно показывать
 *  состояния загрузки в UI (и это же примерно поведение реального API). */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type Params = Record<string, string | number | boolean | undefined>

export async function apiGet<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
  if (!apiUrl) {
    throw new ApiError(0, 'VITE_API_URL не задан, а VITE_USE_MOCKS=false. Укажи адрес бэкенда в .env.')
  }
  const url = new URL(apiUrl + path)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) throw new ApiError(res.status, `GET ${path} → ${res.status}`)
  return (await res.json()) as T
}
