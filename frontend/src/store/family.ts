import { useEffect, useState } from 'react'
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage'

/** Точка встречи семьи. Локально, в localStorage — не связана с группой
 *  на бэкенде (см. src/store/familyGroup.ts для синхронизации статусов). */
export function useMeetingPoint() {
  const [meetingPointId, setMeetingPointId] = useState<string | null>(() =>
    readJSON<string | null>(STORAGE_KEYS.meetingPoint, null),
  )

  useEffect(() => writeJSON(STORAGE_KEYS.meetingPoint, meetingPointId), [meetingPointId])

  return { meetingPointId, setMeetingPoint: setMeetingPointId }
}
