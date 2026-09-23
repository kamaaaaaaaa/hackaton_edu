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

const POLL_MS = 6000

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

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError && e.message ? e.message : fallback
}

/** Семейная группа, синхронизированная с бэкендом: код группы, участники
 *  и статус «Я в порядке» видны всем членам группы (с любого устройства). */
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
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasGroup = groupCode !== null && myMemberId !== null && myToken !== null

  useEffect(() => writeJSON(STORAGE_KEYS.groupCode, groupCode), [groupCode])
  useEffect(() => writeJSON(STORAGE_KEYS.myMemberId, myMemberId), [myMemberId])
  useEffect(() => writeJSON(STORAGE_KEYS.myToken, myToken), [myToken])

  const refresh = useCallback(async () => {
    if (!groupCode) return
    setLoading(true)
    try {
      const res = await getGroupMembers(groupCode)
      setMembers(res.members.map((m) => toFamilyMember(m, myMemberId)))
      setError(null)
    } catch (e) {
      setError(errorMessage(e, 'Не удалось обновить данные семьи.'))
    } finally {
      setLoading(false)
    }
  }, [groupCode, myMemberId])

  // Пока состоим в группе и экран открыт — опрашиваем бэкенд, чтобы видеть
  // отметки родных без ручного обновления страницы.
  useEffect(() => {
    if (!hasGroup) return
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGroup, groupCode])

  const create = useCallback(async (name: string, phone: string) => {
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Введите имя.')
      throw new Error('Введите имя.')
    }
    setLoading(true)
    setError(null)
    try {
      const res = await createGroup({ name: cleanName, phone: phone.trim() })
      setGroupCode(res.group.code)
      setMyMemberId(res.member.id)
      setMyToken(res.member.token)
      setMembers([toFamilyMember(res.member, res.member.id)])
      trackEvent('group_created')
    } catch (e) {
      const message = errorMessage(e, 'Не удалось создать семью. Попробуйте ещё раз.')
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const join = useCallback(async (code: string, name: string, phone: string) => {
    const cleanCode = code.trim()
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Введите имя.')
      throw new Error('Введите имя.')
    }
    setLoading(true)
    setError(null)
    try {
      const res = await joinGroup({ code: cleanCode, name: cleanName, phone: phone.trim() })
      setGroupCode(res.group.code)
      setMyMemberId(res.member.id)
      setMyToken(res.member.token)
      setMembers([toFamilyMember(res.member, res.member.id)])
      trackEvent('group_joined')
    } catch (e) {
      const message = errorMessage(e, 'Не удалось присоединиться. Проверьте код.')
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const setMyStatus = useCallback(
    async (status: FamilyStatus) => {
      if (!groupCode || myMemberId === null || !myToken) return
      // Оптимистичное обновление — не ждём ответа, чтобы кнопка чувствовалась мгновенной.
      // Запоминаем прошлый статус, чтобы откатить его, если сервер откажет (403/404/400).
      const previousStatus = members.find((m) => m.isSelf)?.status
      if (status === 'safe') trackEvent('status_safe')
      setMembers((prev) =>
        prev.map((m) =>
          m.isSelf ? { ...m, status, updatedAt: new Date().toISOString() } : m,
        ),
      )
      try {
        await updateMyStatus({ code: groupCode, memberId: myMemberId, token: myToken, status })
        await refresh()
      } catch (e) {
        setError(errorMessage(e, 'Не удалось обновить статус.'))
        if (previousStatus) {
          setMembers((prev) =>
            prev.map((m) => (m.isSelf ? { ...m, status: previousStatus } : m)),
          )
        }
      }
    },
    [groupCode, myMemberId, myToken, refresh, members],
  )

  const leaveGroup = useCallback(() => {
    setGroupCode(null)
    setMyMemberId(null)
    setMyToken(null)
    setMembers([])
    setError(null)
  }, [])

  return {
    hasGroup,
    groupCode,
    members,
    loading,
    error,
    create,
    join,
    refresh,
    setMyStatus,
    leaveGroup,
  }
}
