import { readJSON, STORAGE_KEYS } from '@/lib/storage'
import { CHECKLIST_ITEMS } from '@/data/checklist'

// Индекс готовности — прозрачная формула:
//   чек-лист          до 70 баллов (пропорционально выполненным пунктам)
//   семейная группа   15 баллов (создана или есть код)
//   точка встречи     15 баллов (выбрана)
export const READINESS_WEIGHTS = { checklist: 70, group: 15, meeting: 15 } as const

export interface ReadinessParts {
  checklist: number
  group: number
  meeting: number
  total: number
}

export function computeReadiness(
  checked: Record<string, boolean>,
  hasGroup: boolean,
  hasMeeting: boolean,
): ReadinessParts {
  const done = CHECKLIST_ITEMS.filter((i) => checked[i.id]).length
  const checklist = CHECKLIST_ITEMS.length
    ? Math.round((done / CHECKLIST_ITEMS.length) * READINESS_WEIGHTS.checklist)
    : 0
  const group = hasGroup ? READINESS_WEIGHTS.group : 0
  const meeting = hasMeeting ? READINESS_WEIGHTS.meeting : 0
  return { checklist, group, meeting, total: checklist + group + meeting }
}

/** Семья/точка встречи — читаем из того же localStorage, что и экран «Семья». */
export function readFamilyFlags(): { hasGroup: boolean; hasMeeting: boolean } {
  return {
    hasGroup: Boolean(readJSON<string | null>(STORAGE_KEYS.groupCode, null)),
    hasMeeting: Boolean(readJSON<string | null>(STORAGE_KEYS.meetingPoint, null)),
  }
}

// ---------- Учебная тревога: личный рекорд ----------
export function readDrillBest(): number | null {
  return readJSON<number | null>(STORAGE_KEYS.drillBest, null)
}
