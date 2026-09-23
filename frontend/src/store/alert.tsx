import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { trackEvent } from '@/api/analytics'

interface AlertValue {
  active: boolean
  /** Момент начала тревоги (ms) — для таймера «с момента оповещения». */
  startedAt: number | null
  /** Поднять тревогу (в демо — вручную; в проде — сигнал от МЧС/сенсоров). */
  trigger: () => void
  dismiss: () => void
}

const AlertContext = createContext<AlertValue | null>(null)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const trigger = useCallback(() => {
    setStartedAt(Date.now())
    trackEvent('alert_triggered')
  }, [])
  const dismiss = useCallback(() => setStartedAt(null), [])
  const value = useMemo(
    () => ({ active: startedAt !== null, startedAt, trigger, dismiss }),
    [startedAt, trigger, dismiss],
  )
  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
}

export function useAlert(): AlertValue {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlert должен использоваться внутри AlertProvider')
  return ctx
}
