import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/ui/Logo'
import { InstallButton } from './InstallButton'
import { useI18n } from '@/i18n'

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-px grid gap-6 py-10 md:grid-cols-[1.4fr_1fr_auto] md:items-start">
        <div className="flex items-start gap-3">
          <LogoMark size={28} />
          <div>
            <p className="font-display text-sm font-semibold">{t('app.name')}</p>
            <p className="mt-1 max-w-sm text-sm text-muted">{t('footer.tagline')}</p>
          </div>
        </div>
        <ul className="space-y-1.5">
          <li className="cap">{t('footer.map')}</li>
          <li className="cap">{t('footer.data')}</li>
          <li className="cap">{t('footer.demo')}</li>
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <InstallButton />
          <Link to="/dev" className="cap hover:text-ink">
            {t('footer.dev')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
