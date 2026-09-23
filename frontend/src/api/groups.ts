// Семейная группа с синхронизацией через реальный бэкенд (не моки —
// см. frontend/API_CONTRACT.md, эндпоинты /groups/...).
// Токен участника — секрет, хранится только у него в localStorage
// (см. src/store/familyGroup.ts) и никогда не приходит в списке участников.

import { config, ApiError } from './client'
import type { FamilyStatus } from './types'

/** Участник группы, как его отдаёт бэкенд. */
export interface GroupMemberDTO {
  id: number
  /** Есть только в ответе create/join — секрет самого участника. */
  token?: string
  name: string
  phone: string
  isSelf: boolean
  status: FamilyStatus
  updatedAt: string
}

export interface GroupInfo {
  code: string
}

/** Ответ create/join: токен приходит один раз, дальше его нужно хранить самому. */
export interface GroupAuthResponse {
  group: GroupInfo
  member: GroupMemberDTO & { token: string; isSelf: true }
}

export interface GroupMembersResponse {
  group: GroupInfo
  members: GroupMemberDTO[]
}

async function requestJson<T>(path: string, method: string, body?: unknown): Promise<T> {
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

export function createGroup(params: { name: string; phone: string }): Promise<GroupAuthResponse> {
  return requestJson<GroupAuthResponse>('/groups/create/', 'POST', params)
}

export function joinGroup(params: {
  code: string
  name: string
  phone: string
}): Promise<GroupAuthResponse> {
  return requestJson<GroupAuthResponse>('/groups/join/', 'POST', params)
}

export function getGroupMembers(code: string): Promise<GroupMembersResponse> {
  return requestJson<GroupMembersResponse>(`/groups/${encodeURIComponent(code)}/members/`, 'GET')
}

export function updateMyStatus(params: {
  code: string
  memberId: number
  token: string
  status: FamilyStatus
}): Promise<GroupMemberDTO> {
  const { code, memberId, token, status } = params
  return requestJson<GroupMemberDTO>(
    `/groups/${encodeURIComponent(code)}/members/${memberId}/`,
    'PATCH',
    { token, status },
  )
}
