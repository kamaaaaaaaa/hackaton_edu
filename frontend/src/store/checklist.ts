import { useCallback, useEffect, useMemo, useState } from 'react'
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage'
import { CHECKLIST_ITEMS } from '@/data/checklist'
import { trackEvent } from '@/api/analytics'

type CheckedMap = Record<string, boolean>

/** Прогресс чек-листа готовности в localStorage. */
export function useChecklist() {
  const [checked, setChecked] = useState<CheckedMap>(() =>
    readJSON<CheckedMap>(STORAGE_KEYS.checklist, {}),
  )

  useEffect(() => writeJSON(STORAGE_KEYS.checklist, checked), [checked])

  const toggle = useCallback(
    (id: string) =>
      setChecked((prev) => {
        const next = { ...prev, [id]: !prev[id] }
        const doneNext = CHECKLIST_ITEMS.filter((item) => next[item.id]).length
        if (CHECKLIST_ITEMS.length > 0 && doneNext === CHECKLIST_ITEMS.length) {
          trackEvent('checklist_completed')
        }
        return next
      }),
    [],
  )
  const reset = useCallback(() => setChecked({}), [])

  const doneCount = useMemo(
    () => CHECKLIST_ITEMS.filter((item) => checked[item.id]).length,
    [checked],
  )
  const total = CHECKLIST_ITEMS.length
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100)

  return { checked, toggle, reset, doneCount, total, percent }
}
