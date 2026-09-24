import { Link, NavLink } from 'react-router-dom'
import { m } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
import { IconAlert } from '@/components/ui/icons'
import { useI18n, type TranslationKey } from '@/i18n'
import { LangMenu } from './LangMenu'
import { useAlert } from '@/store/alert'
import { useAuth } from '@/store/auth'

const NAV: { to: string; key: TranslationKey }[] = [
  { to: '/map', key: 'nav.map' },
  { to: '/houses', key: 'nav.houses' },
  { to: '/family', key: 'nav.family' },
  { to: '/checklist', key: 'nav.checklist' },
  { to: '/drill', key: 'nav.drill' },
]

export function Header() {
  const { t } = useI18n()
  const { trigger } = useAlert()
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-[900] border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="container-px flex h-16 items-center justify-between gap-3">
        <Link to="/" aria-label={t('app.name')} className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t('nav.main')}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className="relative rounded-full px-3.5 py-2 text-sm font-semibold">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <m.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className={`relative ${isActive ? 'text-white' : 'text-muted hover:text-ink'}`}>
                    {t(item.key)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={trigger}
            aria-label={t('alarm.simulate')}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-2 rounded-full border border-signal/40 bg-signal-soft px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-signal-ink transition-colors hover:bg-signal/15 lg:px-3"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-signal animate-blink" />
            <IconAlert className="lg:hidden" width={17} height={17} />
            <span className="hidden lg:inline">{t('alarm.badge')}</span>
          </button>

          {user ? (
            <div className="hidden items-center gap-1 lg:flex">
              <span className="chip">{user.username}</span>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
              >
                {t('header.logout')}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-1 lg:flex">
              <Link to="/login" className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink">
                {t('header.login')}
              </Link>
              <Link to="/register" className="chip hover:text-ink">
                {t('header.register')}
              </Link>
            </div>
          )}

          <LangMenu />
        </div>
      </div>
    </header>
  )
}
