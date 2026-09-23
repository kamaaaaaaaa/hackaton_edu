import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { Logo } from './Logo'

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-line bg-white">
      <div className="container-px flex flex-col gap-3 py-8 text-sm text-subink sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={22} showWordmark={false} />
          <span className="max-w-md">{t('footer.tagline')}</span>
        </div>
        <div className="flex items-center gap-4 text-xs leading-relaxed">
          <span>
            {t('footer.demo')}
            <br className="hidden sm:block" /> {t('footer.map')}
          </span>
          <Link
            to="/dev"
            className="inline-flex shrink-0 items-center gap-1 text-subink/70 transition hover:text-subink"
          >
            {t('footer.dev')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
