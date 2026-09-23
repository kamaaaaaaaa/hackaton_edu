import { useCallback, useEffect, useState } from 'react'
import type { FamilyMember, FamilyStatus } from '@/api/types'
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage'

const uid = () => Math.random().toString(36).slice(2, 10)

function initialMembers(): FamilyMember[] {
  return [
    {
      id: 'self',
      name: '',
      phone: '',
      isSelf: true,
      status: 'unknown',
      updatedAt: new Date().toISOString(),
    },
  ]
}

/** Семейный круг + точка встречи. Всё хранится в localStorage. */
export function useFamily() {
  const [members, setMembers] = useState<FamilyMember[]>(() =>
    readJSON(STORAGE_KEYS.family, initialMembers()),
  )
  const [meetingPointId, setMeetingPointId] = useState<string | null>(() =>
    readJSON<string | null>(STORAGE_KEYS.meetingPoint, null),
  )

  useEffect(() => writeJSON(STORAGE_KEYS.family, members), [members])
  useEffect(() => writeJSON(STORAGE_KEYS.meetingPoint, meetingPointId), [meetingPointId])

  const add = useCallback((name: string, phone: string) => {
    const clean = name.trim()
    if (!clean) return
    setMembers((prev) => [
      ...prev,
      {
        id: uid(),
        name: clean,
        phone: phone.trim(),
        status: 'unknown',
        updatedAt: new Date().toISOString(),
      },
    ])
  }, [])

  const remove = useCallback((id: string) => {
    setMembers((prev) => prev.filter((m) => m.isSelf || m.id !== id))
  }, [])

  const setStatus = useCallback((id: string, status: FamilyStatus) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status, updatedAt: new Date().toISOString() } : m,
      ),
    )
  }, [])

  const setMeetingPoint = useCallback(
    (id: string | null) => setMeetingPointId(id),
    [],
  )

  return { members, add, remove, setStatus, meetingPointId, setMeetingPoint }
}
