import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { ApiError } from '@/api/client'
import { useI18n } from '@/i18n'

export function Login() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ username: username.trim(), password })
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError && err.message ? err.message : t('misc.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-px py-10 md:py-14">
      <div className="mx-auto max-w-sm">
        <header>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            {t('auth.login.title')}
          </h1>
          <p className="mt-2 text-subink">{t('auth.login.subtitle')}</p>
        </header>

        <form onSubmit={onSubmit} className="card mt-6 p-5">
          <div className="space-y-2.5">
            <input
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.usernamePlaceholder')}
              aria-label={t('auth.username')}
              autoComplete="username"
              required
            />
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              aria-label={t('auth.password')}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="mt-2 text-sm text-risk-high">{error}</p>}

          <button type="submit" className="btn btn-primary mt-3 w-full" disabled={loading}>
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>

          <p className="mt-4 text-center text-sm text-subink">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="font-semibold text-navy-700 hover:underline">
              {t('auth.login.toRegister')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
