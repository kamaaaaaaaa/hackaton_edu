import { Link, NavLink } from 'react-router-dom'
import { Logo } from './Logo'
import { LangSwitch } from './LangSwitch'
import { useI18n, type TranslationKey } from '@/i18n'
import { useAlert } from '@/store/alert'

const NAV: { to: string; key: TranslationKey }[] = [
  { to: '/map', key: 'nav.map' },
  { to: '/family', key: 'nav.family' },
  { to: '/checklist', key: 'nav.checklist' },
]

export function Header() {
  const { t } = useI18n()
  const { trigger } = useAlert()

  return (
    <header className="sticky top-0 z-[900] border-b border-line/80 bg-white/80 backdrop-blur">
      <div className="container-px flex h-16 items-center justify-between gap-3">
        <Link to="/" aria-label={t('app.name')} className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-mist text-navy-700' : 'text-subink hover:text-navy-700'
                }`
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={trigger}
            className="inline-flex items-center gap-1.5 rounded-full border border-risk-high/30 bg-risk-high/5 px-3 py-1.5 text-xs font-bold text-risk-high transition hover:bg-risk-high/10"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-risk-high animate-alert-pulse" />
            {t('alarm.badge')}
          </button>
          <LangSwitch />
        </div>
      </div>
    </header>
  )
}
