import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'

export function NotFound() {
  const { t } = useI18n()
  return (
    <div className="container-px flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="font-mono text-mega font-semibold text-faint">404</div>
      {/* Ровная линия — сигнала нет */}
      <svg viewBox="0 0 400 40" className="mt-4 h-10 w-full max-w-md" aria-hidden>
        <path d="M0 20 H400" stroke="#111113" strokeWidth="1.6" />
        <circle cx="200" cy="20" r="3.5" fill="#5B3DF5" className="animate-blink" />
      </svg>
      <h1 className="mt-4 font-display text-xl font-semibold">{t('notfound.title')}</h1>
      <p className="mt-1 text-muted">{t('notfound.body')}</p>
      <Link to="/" className="btn btn-ink mt-6">
        {t('nav.home')}
      </Link>
    </div>
  )
}
