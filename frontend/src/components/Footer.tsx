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
        <div className="text-xs leading-relaxed">
          {t('footer.demo')}
          <br className="hidden sm:block" /> {t('footer.map')}
        </div>
      </div>
    </footer>
  )
}
