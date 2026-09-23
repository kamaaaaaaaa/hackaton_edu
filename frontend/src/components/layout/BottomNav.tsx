import type { ComponentType, SVGProps } from 'react'
import { NavLink } from 'react-router-dom'
import { m } from 'framer-motion'
import { IconBuilding, IconGauge, IconMap, IconTimer, IconUsers } from '@/components/ui/icons'
import { useI18n, type TranslationKey } from '@/i18n'

const ITEMS: { to: string; key: TranslationKey; Icon: ComponentType<SVGProps<SVGSVGElement>>; end: boolean }[] = [
  { to: '/map', key: 'nav.map', Icon: IconMap, end: false },
  { to: '/houses', key: 'nav.houses', Icon: IconBuilding, end: false },
  { to: '/family', key: 'nav.family', Icon: IconUsers, end: false },
  { to: '/checklist', key: 'nav.checklist', Icon: IconGauge, end: false },
  { to: '/drill', key: 'nav.drill', Icon: IconTimer, end: false },
]

/** Нижняя навигация для телефона — в зоне большого пальца. Главная — по логотипу. */
export function BottomNav() {
  const { t } = useI18n()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[900] border-t border-line bg-surface/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('nav.main')}
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map(({ to, key, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="buzz-parent flex min-h-[60px] flex-col items-center justify-center gap-1">
            {({ isActive }) => (
              <>
                <span className="relative grid h-8 w-12 place-items-center">
                  {isActive && (
                    <m.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full bg-acid"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    />
                  )}
                  <Icon className={`buzz relative ${isActive ? 'text-ink' : 'text-muted'}`} width={21} height={21} />
                </span>
                <span className={`text-[10.5px] font-semibold ${isActive ? 'text-ink' : 'text-muted'}`}>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
