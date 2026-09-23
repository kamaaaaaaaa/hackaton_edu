import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface AlertValue {
  active: boolean
  /** Поднять тревогу (в демо — вручную; в проде — сигнал от МЧС/сенсоров). */
  trigger: () => void
  dismiss: () => void
}

const AlertContext = createContext<AlertValue | null>(null)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const trigger = useCallback(() => setActive(true), [])
  const dismiss = useCallback(() => setActive(false), [])
  const value = useMemo(() => ({ active, trigger, dismiss }), [active, trigger, dismiss])
  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
}

export function useAlert(): AlertValue {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlert должен использоваться внутри AlertProvider')
  return ctx
}
