import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'

export function NotFound() {
  const { t } = useI18n()
  return (
    <div className="container-px flex min-h-[55vh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl font-extrabold text-navy-200">404</p>
      <p className="mt-3 text-subink">{t('misc.error')}</p>
      <Link to="/" className="btn btn-primary mt-6">
        {t('nav.home')}
      </Link>
    </div>
  )
}
