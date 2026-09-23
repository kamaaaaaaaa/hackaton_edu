import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError } from '@/api/client'
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister, type AuthUser } from '@/api/auth'
import { trackEvent } from '@/api/analytics'
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage'

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError && e.message ? e.message : fallback
}

interface AuthValue {
  user: AuthUser | null
  loading: boolean
  error: string | null
  register: (params: { username: string; email: string; password: string }) => Promise<void>
  login: (params: { username: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    readJSON<string | null>(STORAGE_KEYS.authToken, null),
  )
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => writeJSON(STORAGE_KEYS.authToken, token), [token])

  // При старте приложения, если токен уже сохранён — пробуем восстановить сессию.
  useEffect(() => {
    if (!token) return
    let alive = true
    setLoading(true)
    getMe(token)
      .then((res) => {
        if (!alive) return
        setUser(res.user)
      })
      .catch((e) => {
        if (!alive) return
        if (e instanceof ApiError && e.status === 401) {
          setToken(null)
        }
        setUser(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const register = useCallback(
    async (params: { username: string; email: string; password: string }) => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiRegister(params)
        setToken(res.token)
        setUser(res.user)
        trackEvent('user_registered')
      } catch (e) {
        const message = errorMessage(e, 'Не удалось зарегистрироваться. Попробуйте ещё раз.')
        setError(message)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const login = useCallback(async (params: { username: string; password: string }) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiLogin(params)
      setToken(res.token)
      setUser(res.user)
      trackEvent('user_logged_in')
    } catch (e) {
      const message = errorMessage(e, 'Не удалось войти. Проверьте логин и пароль.')
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    const current = token
    setToken(null)
    setUser(null)
    if (current) {
      try {
        await apiLogout(current)
      } catch {
        /* токен уже сброшен локально — ошибка выхода на сервере не критична */
      }
    }
  }, [token])

  const value = useMemo(
    () => ({ user, loading, error, register, login, logout }),
    [user, loading, error, register, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider')
  return ctx
}
