// Регистрация/вход через реальный бэкенд (см. frontend/API_CONTRACT.md,
// эндпоинты /auth/...). Токен — секрет пользователя, хранится в localStorage
// (см. src/store/auth.tsx) и передаётся в заголовке Authorization: Token <token>.

import { config, ApiError } from './client'

export interface AuthUser {
  id: number
  username: string
  email: string
  isStaff: boolean
}

export interface AuthResponse {
  user: AuthUser
  token: string
}

export interface MeResponse {
  user: AuthUser
}

async function requestJson<T>(
  path: string,
  method: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  if (!config.apiUrl) {
    throw new ApiError(0, 'VITE_API_URL не задан. Укажи адрес бэкенда в .env.')
  }
  let res: Response
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Не удалось подключиться к серверу. Проверьте интернет-соединение.')
  }

  if (!res.ok) {
    let message = `${method} ${path} → ${res.status}`
    try {
      const data = (await res.json()) as { error?: string }
      if (data && typeof data.error === 'string' && data.error.trim()) {
        message = data.error
      }
    } catch {
      /* тело ответа не JSON — используем дефолтное сообщение */
    }
    throw new ApiError(res.status, message)
  }

  return (await res.json()) as T
}

export function register(params: {
  username: string
  email: string
  password: string
}): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/register/', 'POST', params)
}

export function login(params: { username: string; password: string }): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/login/', 'POST', params)
}

export function logout(token: string): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>('/auth/logout/', 'POST', undefined, token)
}

export function getMe(token: string): Promise<MeResponse> {
  return requestJson<MeResponse>('/auth/me/', 'GET', undefined, token)
}
