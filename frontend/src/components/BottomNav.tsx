import { NavLink } from 'react-router-dom'
import { IconHome, IconMap, IconUsers, IconCheck } from './icons'
import { useI18n, type TranslationKey } from '@/i18n'
import type { ComponentType, SVGProps } from 'react'

const ITEMS: {
  to: string
  key: TranslationKey
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  end: boolean
}[] = [
  { to: '/', key: 'nav.home', Icon: IconHome, end: true },
  { to: '/map', key: 'nav.map', Icon: IconMap, end: false },
  { to: '/family', key: 'nav.family', Icon: IconUsers, end: false },
  { to: '/checklist', key: 'nav.checklist', Icon: IconCheck, end: false },
]

/** Нижняя навигация — только на мобильных (доступно одной рукой). */
export function BottomNav() {
  const { t } = useI18n()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[900] border-t border-line bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ to, key, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                isActive ? 'text-navy-700' : 'text-subink'
              }`
            }
          >
            <Icon width={22} height={22} />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
