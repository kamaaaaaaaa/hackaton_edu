import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { getMappedPoints } from '@/api/assemblyPoints'
import { useI18n } from '@/i18n'
import { nearestByStraightLine } from '@/lib/geo'
import { formatDistance } from '@/lib/format'
import { isInAlmaty, useGeo } from '@/store/geo'
import { IconArrowRight, IconX } from '@/components/ui/icons'

const KEY = 'gkt.geoToast.dismissed'

function readDismissed() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Как только браузер отдал координаты — короткая плашка: местоположение
 * определено, ближайший официальный пункт (по прямой) и кнопка «Маршрут».
 * На карте не показываем: там сразу строится настоящий пеший маршрут.
 */
export function GeoToast() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const geo = useGeo()
  const [dismissed, setDismissed] = useState(readDismissed)

  const nearest = useMemo(() => {
    if (!geo.position || !isInAlmaty(geo.position)) return null
    return nearestByStraightLine(geo.position, getMappedPoints(), 1)[0] ?? null
  }, [geo.position])

  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* приватный режим */
    }
  }

  const show = !dismissed && pathname !== '/map' && nearest !== null

  return (
    <AnimatePresence>
      {show && nearest && (
        <m.div
          role="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[950] md:inset-x-auto md:bottom-6 md:right-6 md:w-[400px]"
        >
          <div className="card flex items-center gap-3 p-3 shadow-lift">
            <span className="me-dot shrink-0" aria-hidden>
              <span className="me-halo" />
              <span className="me-core" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink">{t('geo.toast.title')}</div>
              <div className="truncate text-xs text-muted">
                {nearest.point.name} · {formatDistance(nearest.straightM)} {t('geo.toast.straight')}
              </div>
            </div>
            <Link to="/map" onClick={dismiss} className="btn btn-ink btn-sm shrink-0">
              {t('geo.toast.route')}
              <IconArrowRight width={15} height={15} />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('action.close')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-ink"
            >
              <IconX width={15} height={15} />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
