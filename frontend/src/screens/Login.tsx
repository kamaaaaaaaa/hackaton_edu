import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { ApiError } from '@/api/client'
import { useI18n } from '@/i18n'
import { LogoMark } from '@/components/ui/Logo'

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
    <div className="container-px py-12 md:py-20">
      <div className="mx-auto max-w-sm">
        <LogoMark size={40} />
        <h1 className="mt-6 font-display text-display font-bold">{t('auth.login.title')}</h1>
        <p className="mt-2 text-muted">{t('auth.login.subtitle')}</p>

        <form onSubmit={onSubmit} className="card mt-6 space-y-2.5 p-5">
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
          {error && <p className="text-sm font-medium text-signal-ink">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>
          <p className="pt-2 text-center text-sm text-muted">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="font-semibold text-accent hover:underline">
              {t('auth.login.toRegister')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
