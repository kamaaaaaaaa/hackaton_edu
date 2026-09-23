import { useCallback, useEffect, useState } from 'react'
import type { FamilyMember, FamilyStatus } from '@/api/types'
import { ApiError } from '@/api/client'
import {
  createGroup,
  getGroupMembers,
  joinGroup,
  updateMyStatus,
  type GroupMemberDTO,
} from '@/api/groups'
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage'
import { trackEvent } from '@/api/analytics'
import { CODE_ALPHABET, CODE_LENGTH } from '@/components/ui/CodeInput'

const POLL_MS = 6000

/** Семья в демо-режиме: сервер недоступен, данные — только на этом устройстве. */
interface LocalFamily {
  code: string
  members: FamilyMember[]
  /** Почему включили демо-режим (для честной плашки в интерфейсе). */
  reason: string
}

function toFamilyMember(m: GroupMemberDTO, selfId: number | null): FamilyMember {
  return {
    id: String(m.id),
    name: m.name,
    phone: m.phone,
    isSelf: selfId !== null && m.id === selfId,
    status: m.status,
    updatedAt: m.updatedAt,
  }
}

/** Понятное сообщение по ошибке сервера. */
export function describeGroupError(e: unknown, fallback: string): string {
  if (!(e instanceof ApiError)) return fallback
  if (e.status === 0) return 'Нет связи с сервером семьи. Проверьте интернет.'
  if (e.status >= 500) return `Сервер семьи сейчас не работает (ошибка ${e.status}).`
  if (e.status === 404) return 'Семья с таким кодом не найдена. Проверьте все 6 символов.'
  return e.message || fallback
}

/** Сервер не ответил или упал — можно продолжить в демо-режиме на устройстве. */
const serverDown = (e: unknown) => e instanceof ApiError && (e.status === 0 || e.status >= 500)

function randomCode(): string {
  const bytes = new Uint32Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

const now = () => new Date().toISOString()

/** Семейная группа, синхронизированная с бэкендом: код группы, участники
 *  и статус «Я в порядке» видны всем членам группы (с любого устройства).
 *  Если сервер недоступен — демо-режим: та же семья, но только на этом устройстве. */
export function useFamilyGroup() {
  const [groupCode, setGroupCode] = useState<string | null>(() =>
    readJSON<string | null>(STORAGE_KEYS.groupCode, null),
  )
  const [myMemberId, setMyMemberId] = useState<number | null>(() =>
    readJSON<number | null>(STORAGE_KEYS.myMemberId, null),
  )
  const [myToken, setMyToken] = useState<string | null>(() =>
    readJSON<string | null>(STORAGE_KEYS.myToken, null),
  )
  const [local, setLocal] = useState<LocalFamily | null>(() =>
    readJSON<LocalFamily | null>(STORAGE_KEYS.familyLocal, null),
  )
  const [serverMembers, setServerMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isServerGroup = groupCode !== null && myMemberId !== null && myToken !== null
  const hasGroup = isServerGroup || local !== null
  const mode: 'server' | 'local' | null = isServerGroup ? 'server' : local ? 'local' : null
  const members = mode === 'local' && local ? local.members : serverMembers

  useEffect(() => writeJSON(STORAGE_KEYS.groupCode, groupCode), [groupCode])
  useEffect(() => writeJSON(STORAGE_KEYS.myMemberId, myMemberId), [myMemberId])
  useEffect(() => writeJSON(STORAGE_KEYS.myToken, myToken), [myToken])
  useEffect(() => writeJSON(STORAGE_KEYS.familyLocal, local), [local])

  const refresh = useCallback(async () => {
    if (!groupCode) return
    setLoading(true)
    try {
      const res = await getGroupMembers(groupCode)
      setServerMembers(res.members.map((m) => toFamilyMember(m, myMemberId)))
      setError(null)
    } catch (e) {
      setError(describeGroupError(e, 'Не удалось обновить данные семьи.'))
    } finally {
      setLoading(false)
    }
  }, [groupCode, myMemberId])

  // Пока состоим в группе и экран открыт — опрашиваем бэкенд, чтобы видеть
  // отметки родных без ручного обновления страницы.
  useEffect(() => {
    if (!isServerGroup) return
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isServerGroup, groupCode])

  const startLocal = useCallback((code: string, name: string, phone: string, reason: string) => {
    setLocal({
      code,
      reason,
      members: [{ id: 'local-self', name, phone, isSelf: true, status: 'unknown', updatedAt: now() }],
    })
    setError(null)
  }, [])

  const create = useCallback(
    async (name: string, phone: string) => {
      const cleanName = name.trim()
      if (!cleanName) {
        setError('Введите имя.')
        throw new Error('Введите имя.')
      }
      setLoading(true)
      setError(null)
      try {
        const res = await createGroup({ name: cleanName, phone: phone.trim() })
        setLocal(null)
        setGroupCode(res.group.code)
        setMyMemberId(res.member.id)
        setMyToken(res.member.token)
        setServerMembers([toFamilyMember(res.member, res.member.id)])
        trackEvent('group_created')
      } catch (e) {
        if (serverDown(e)) {
          startLocal(randomCode(), cleanName, phone.trim(), describeGroupError(e, ''))
          return
        }
        const message = describeGroupError(e, 'Не удалось создать семью. Попробуйте ещё раз.')
        setError(message)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [startLocal],
  )

  const join = useCallback(
    async (code: string, name: string, phone: string) => {
      const cleanCode = code.trim().toUpperCase()
      const cleanName = name.trim()
      if (!cleanName) {
        setError('Введите имя.')
        throw new Error('Введите имя.')
      }
      if (cleanCode.length !== CODE_LENGTH) {
        setError('В коде семьи 6 символов.')
        throw new Error('В коде семьи 6 символов.')
      }
      setLoading(true)
      setError(null)
      try {
        const res = await joinGroup({ code: cleanCode, name: cleanName, phone: phone.trim() })
        setLocal(null)
        setGroupCode(res.group.code)
        setMyMemberId(res.member.id)
        setMyToken(res.member.token)
        setServerMembers([toFamilyMember(res.member, res.member.id)])
        trackEvent('group_joined')
      } catch (e) {
        if (serverDown(e)) {
          startLocal(cleanCode, cleanName, phone.trim(), describeGroupError(e, ''))
          return
        }
        const message = describeGroupError(e, 'Не удалось присоединиться. Проверьте код.')
        setError(message)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [startLocal],
  )

  const setMyStatus = useCallback(
    async (status: FamilyStatus) => {
      if (status === 'safe') trackEvent('status_safe')
      if (mode === 'local') {
        setLocal((l) =>
          l ? { ...l, members: l.members.map((m) => (m.isSelf ? { ...m, status, updatedAt: now() } : m)) } : l,
        )
        return
      }
      if (!groupCode || myMemberId === null || !myToken) return
      // Оптимистичное обновление — не ждём ответа, чтобы кнопка чувствовалась мгновенной.
      // Запоминаем прошлый статус, чтобы откатить его, если сервер откажет (403/404/400).
      const previousStatus = serverMembers.find((m) => m.isSelf)?.status
      setServerMembers((prev) => prev.map((m) => (m.isSelf ? { ...m, status, updatedAt: now() } : m)))
      try {
        await updateMyStatus({ code: groupCode, memberId: myMemberId, token: myToken, status })
        await refresh()
      } catch (e) {
        setError(describeGroupError(e, 'Не удалось обновить статус.'))
        if (previousStatus) {
          setServerMembers((prev) => prev.map((m) => (m.isSelf ? { ...m, status: previousStatus } : m)))
        }
      }
    },
    [mode, groupCode, myMemberId, myToken, refresh, serverMembers],
  )

  /** Демо-режим: добавить близкого вручную (на сервере каждый входит сам по коду). */
  const addLocalMember = useCallback((name: string, phone: string) => {
    const clean = name.trim()
    if (!clean) return
    setLocal((l) =>
      l
        ? {
            ...l,
            members: [
              ...l.members,
              { id: `local-${Date.now()}`, name: clean, phone, isSelf: false, status: 'unknown', updatedAt: now() },
            ],
          }
        : l,
    )
  }, [])

  /** Демо-режим: показать, как меняются статусы близких. */
  const cycleLocalStatus = useCallback((id: string) => {
    const order: FamilyStatus[] = ['unknown', 'safe', 'no_contact']
    setLocal((l) =>
      l
        ? {
            ...l,
            members: l.members.map((m) =>
              m.id === id ? { ...m, status: order[(order.indexOf(m.status) + 1) % order.length], updatedAt: now() } : m,
            ),
          }
        : l,
    )
  }, [])

  const leaveGroup = useCallback(() => {
    setGroupCode(null)
    setMyMemberId(null)
    setMyToken(null)
    setServerMembers([])
    setLocal(null)
    setError(null)
  }, [])

  return {
    hasGroup,
    mode,
    localReason: local?.reason ?? null,
    groupCode: mode === 'local' ? (local?.code ?? null) : groupCode,
    members,
    loading,
    error,
    create,
    join,
    refresh,
    setMyStatus,
    addLocalMember,
    cycleLocalStatus,
    leaveGroup,
  }
}
