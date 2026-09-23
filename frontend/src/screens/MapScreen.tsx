import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AddressSearch } from '@/components/map/AddressSearch'
import { MapView } from '@/components/map/MapView'
import { HouseCard } from '@/components/HouseCard'
import { Spinner } from '@/components/Spinner'
import { IconRoute } from '@/components/icons'
import { getAssemblyPoints, getHouse, type AssemblyPoint } from '@/api'
import { trackEvent } from '@/api/analytics'
import { nearestPoint, formatDistance } from '@/lib/geo'
import { useSelectedHouse } from '@/store/house'
import { useI18n } from '@/i18n'
import type { AddressSuggestion } from '@/lib/nominatim'

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-2.5 py-1 text-[11px] font-medium text-subink backdrop-blur">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  )
}

export function MapScreen() {
  const { t } = useI18n()
  const location = useLocation()
  const navState = location.state as { showRoute?: boolean } | null

  const { house, setHouse } = useSelectedHouse()
  const [points, setPoints] = useState<AssemblyPoint[]>([])
  const [loadingHouse, setLoadingHouse] = useState(false)
  const [showRoute, setShowRoute] = useState<boolean>(Boolean(navState?.showRoute))

  useEffect(() => {
    let alive = true
    getAssemblyPoints()
      .then((p) => alive && setPoints(p))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (navState?.showRoute) setShowRoute(true)
  }, [navState])

  const nearest = useMemo(
    () => (house ? nearestPoint({ lat: house.lat, lon: house.lon }, points) : null),
    [house, points],
  )

  const onSelect = async (s: AddressSuggestion) => {
    setLoadingHouse(true)
    try {
      const h = await getHouse({ lat: s.lat, lon: s.lon, address: s.shortLabel || s.label })
      setHouse(h)
      trackEvent('house_checked', { risk: h.risk })
      setShowRoute(true)
    } finally {
      setLoadingHouse(false)
    }
  }

  return (
    <div className="container-px py-6 md:py-8">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('map.title')}</h1>

      <div className="relative z-20 mt-4 max-w-xl">
        <AddressSearch onSelect={onSelect} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative isolate z-0 h-[52vh] min-h-[360px] overflow-hidden rounded-3xl border border-line shadow-soft lg:h-[68vh]">
          <MapView points={points} house={house} nearest={nearest} showRoute={showRoute} />
          <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-2">
            <LegendChip color="bg-spark" label={t('map.legend.house')} />
            <LegendChip color="bg-navy-600" label={t('map.legend.point')} />
            <LegendChip color="bg-risk-low" label={t('map.legend.nearest')} />
          </div>
        </div>

        <div className="space-y-4">
          {loadingHouse && (
            <div className="card flex items-center gap-3 p-5 text-subink">
              <Spinner /> {t('misc.loading')}
            </div>
          )}

          {!loadingHouse && !house && (
            <div className="card p-6">
              <p className="eyebrow">{t('nav.map')}</p>
              <h3 className="mt-1 font-display text-lg font-bold text-ink">{t('map.empty.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-subink">{t('map.empty.body')}</p>
              <div className="mt-4">
                <span className="chip">
                  {points.length} {t('map.points.count')}
                </span>
              </div>
            </div>
          )}

          {house && !loadingHouse && <HouseCard house={house} />}

          {house && nearest && (
            <div className="card p-5 animate-fade-up">
              <p className="eyebrow">{t('map.nearest')}</p>
              <h3 className="mt-1 font-display text-lg font-bold text-ink">{nearest.point.name}</h3>
              {nearest.point.district && (
                <p className="text-sm text-subink">{nearest.point.district} р-н</p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-mist px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-subink">
                    {t('map.legend.nearest')}
                  </div>
                  <div className="mt-0.5 font-display text-xl font-extrabold text-ink">
                    {formatDistance(nearest.distanceM)}
                  </div>
                </div>
                <div className="rounded-2xl bg-mist px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-subink">{t('map.walk')}</div>
                  <div className="mt-0.5 font-display text-xl font-extrabold text-ink">
                    ≈ {nearest.walkMinutes} {t('map.min')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRoute((v) => !v)}
                className={`btn mt-4 w-full ${showRoute ? 'btn-ghost' : 'btn-primary'}`}
              >
                <IconRoute width={20} height={20} />
                {showRoute ? t('map.route.hide') : t('map.route.build')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
