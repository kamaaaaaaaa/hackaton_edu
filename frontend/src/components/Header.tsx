import { Link, NavLink } from 'react-router-dom'
import { Logo } from './Logo'
import { LangSwitch } from './LangSwitch'
import { useI18n, type TranslationKey } from '@/i18n'
import { useAlert } from '@/store/alert'
import { useAuth } from '@/store/auth'

const NAV: { to: string; key: TranslationKey }[] = [
  { to: '/map', key: 'nav.map' },
  { to: '/family', key: 'nav.family' },
  { to: '/checklist', key: 'nav.checklist' },
]

export function Header() {
  const { t } = useI18n()
  const { trigger } = useAlert()
  const { user, logout } = useAuth()

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

          {user ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-navy-700">
                {user.username}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-subink transition hover:text-risk-high"
              >
                {t('header.logout')}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link
                to="/login"
                className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-subink transition hover:text-navy-700"
              >
                {t('header.login')}
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-line"
              >
                {t('header.register')}
              </Link>
            </div>
          )}

          <LangSwitch />
        </div>
      </div>
    </header>
  )
}
