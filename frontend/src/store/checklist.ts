import { useCallback, useEffect, useMemo, useState } from 'react'
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage'
import { CHECKLIST_ITEMS } from '@/data/checklist'

type CheckedMap = Record<string, boolean>

/** Прогресс чек-листа готовности в localStorage. */
export function useChecklist() {
  const [checked, setChecked] = useState<CheckedMap>(() =>
    readJSON<CheckedMap>(STORAGE_KEYS.checklist, {}),
  )

  useEffect(() => writeJSON(STORAGE_KEYS.checklist, checked), [checked])

  const toggle = useCallback(
    (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] })),
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
