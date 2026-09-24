import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  findFastestPoint,
  getAssemblyPoints,
  getHouse,
  getMappedPoints,
  getPointById,
  reverseGeocode,
  walkingRoute,
  type AddressSuggestion,
  type LngLat,
  type MappedPoint,
  type WalkingRoute,
} from '@/api'
import { trackEvent } from '@/api/analytics'
import { OsmUnavailableError } from '@/api/buildings'
import { cachedRoute, findDemoHouseNear, getDemoHouse, getDemoHouses, toHouse, type DemoHouse } from '@/api/houses'
import { useI18n } from '@/i18n'
import { assessRisk } from '@/lib/risk'
import { haversine, isMapped, nearestByStraightLine } from '@/lib/geo'
import { formatDistance, formatMinutes, shortAddress } from '@/lib/format'
import { setSelected, useSelected, type SelectedPlace } from '@/store/house'
import { isInAlmaty, requestLocation, useGeo, watchLocation } from '@/store/geo'
import { savePlan, usePlan, type EvacuationPlan } from '@/store/plan'
import { AddressSearch } from '@/components/map/AddressSearch'
import { HousePanel } from '@/components/map/HousePanel'
import { RoutePanel, type RouteStatus } from '@/components/map/RoutePanel'
import { OfflinePlan } from '@/components/map/OfflinePlan'
import { BottomSheet, sheetVisibleHeight, type SheetSnap } from '@/components/map/BottomSheet'
import { RISK_DOT } from '@/components/houses/riskStyle'
import { Spinner } from '@/components/ui/motion'
import { IconArrowRight, IconChevronDown, IconWifiOff, IconX } from '@/components/ui/icons'

const CityMap = lazy(() => import('@/components/map/CityMap'))

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function useIsDesktop() {
  const query = '(min-width: 768px)'
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return desktop
}

/** Высота элемента (ResizeObserver) — для выдвижной панели. Ref-колбэк: элемент есть только на телефоне. */
function useHeight<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [h, setH] = useState(0)
  useLayoutEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.clientHeight))
    ro.observe(el)
    setH(el.clientHeight)
    return () => ro.disconnect()
  }, [el])
  return [setEl, h] as const
}

const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError'

// Автомаршрут от местоположения — один раз за визит: если человек закрыл
// адрес кнопкой «×», не выбираем его снова сами.
let autoLocatedThisVisit = false

function buildPlan(
  from: SelectedPlace,
  to: MappedPoint,
  route: WalkingRoute,
  candidates: EvacuationPlan['candidates'],
): EvacuationPlan {
  return {
    from: { label: from.label, lat: from.lat, lng: from.lng },
    to: { id: to.id, name: to.name, address: to.address, district: to.district, lat: to.lat, lng: to.lng },
    coordinates: route.coordinates,
    timeSec: route.timeSec,
    lengthM: route.lengthM,
    maneuvers: route.maneuvers,
    provider: route.provider,
    candidates,
    savedAt: new Date().toISOString(),
  }
}

function demoSuggestion(h: DemoHouse): AddressSuggestion {
  return {
    id: `demo-${h.id}`,
    title: h.address,
    subtitle: `${h.district ? `${h.district} р‑н, ` : ''}Алматы`,
    district: h.district,
    lat: h.lat,
    lng: h.lng,
    kind: 'demo-house',
    source: 'demo',
    houseId: h.id,
  }
}

export function MapScreen() {
  const { t } = useI18n()
  const { place, house } = useSelected()
  const plan = usePlan()
  const online = useOnline()
  const desktop = useIsDesktop()
  const [params, setParams] = useSearchParams()
  const geo = useGeo()

  const allPoints = useMemo(() => getAssemblyPoints(), [])
  const points = useMemo(() => getMappedPoints(), [])
  const reviewCount = allPoints.length - points.length
  const demoHouses = useMemo(() => getDemoHouses(), [])
  const mapHouses = useMemo(
    () =>
      demoHouses.map((h) => ({ id: h.id, lat: h.lat, lng: h.lng, floors: h.floors, risk: assessRisk(toHouse(h)).level })),
    [demoHouses],
  )

  // План показываем, только если он построен от текущего адреса
  const activePlan = plan && place && haversine(plan.from, place) < 5 ? plan : null
  const [status, setStatus] = useState<RouteStatus>(activePlan ? 'done' : 'idle')
  const [straight, setStraight] = useState<{ point: MappedPoint; straightM: number } | null>(null)
  const [houseLoading, setHouseLoading] = useState(false)
  const [houseUnavailable, setHouseUnavailable] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [snap, setSnap] = useState<SheetSnap>(place ? 'half' : 'peek')
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  // Десктоп: колонку с панелями можно свернуть, чтобы видеть больше карты
  const [panelOpen, setPanelOpen] = useState(true)
  const ctrlRef = useRef<AbortController | null>(null)
  // Маршруты ко всем сравнённым пунктам — переключение без повторного запроса
  const routesRef = useRef(new Map<string, WalkingRoute>())
  const [sheetAreaRef, sheetAreaH] = useHeight<HTMLDivElement>()

  useEffect(() => () => ctrlRef.current?.abort(), [])

  const loadHouse = useCallback((p: SelectedPlace, signal: AbortSignal) => {
    setHouseLoading(true)
    setHouseUnavailable(false)
    getHouse({ lat: p.lat, lng: p.lng, address: p.label, houseId: p.houseId }, signal)
      .then((h) => {
        setSelected({ house: h })
        trackEvent('house_checked', { risk: assessRisk(h).level ?? 'unknown' })
      })
      .catch((e) => {
        if (isAbort(e)) return
        if (e instanceof OsmUnavailableError) {
          // Сервер OSM не ответил — это не «здания нет»: показываем повтор
          setHouseUnavailable(true)
          return
        }
        // Иная ошибка — честно «нет данных» по всем полям
        setSelected({
          house: {
            address: p.label,
            lat: p.lat,
            lng: p.lng,
            year: null,
            floors: null,
            material: null,
            series: null,
            source: null,
            sourceRef: null,
            isDemo: false,
          },
        })
      })
      .finally(() => {
        if (!signal.aborted) setHouseLoading(false)
      })
  }, [])

  const select = useCallback(
    async (s: AddressSuggestion) => {
      ctrlRef.current?.abort()
      const ctrl = new AbortController()
      ctrlRef.current = ctrl
      const houseId = s.houseId ?? findDemoHouseNear(s, 30)?.id
      const next: SelectedPlace = {
        label: s.title,
        subtitle: s.subtitle,
        district: s.district,
        lat: s.lat,
        lng: s.lng,
        houseId,
      }
      setSelected({ place: next, house: null })
      setStraight(null)
      setActiveStep(null)
      setSnap('half')
      setPanelOpen(true)
      routesRef.current.clear()
      loadHouse(next, ctrl.signal)

      if (!points.length) {
        setStatus('error')
        return
      }

      // Для дома из списка маршрут посчитан заранее — показываем сразу,
      // а живой расчёт (сравнение 5 пунктов) догоняет в фоне.
      const cached = cachedRoute(houseId)
      const cachedTarget = cached ? getPointById(cached.pointId) : null
      const hasCached = Boolean(cached && cachedTarget && isMapped(cachedTarget))
      if (cached && cachedTarget && isMapped(cachedTarget)) {
        routesRef.current.set(cachedTarget.id, cached)
        savePlan(
          buildPlan(next, cachedTarget, cached, [
            { id: cachedTarget.id, name: cachedTarget.name, timeSec: cached.timeSec, lengthM: cached.lengthM },
          ]),
        )
        setStatus('done')
      } else {
        setStatus('loading')
      }

      try {
        const res = await findFastestPoint(next, points, ctrl.signal)
        res.candidates.forEach((c) => routesRef.current.set(c.point.id, c.route))
        savePlan(
          buildPlan(
            next,
            res.best.point,
            res.best.route,
            res.candidates.map((c) => ({
              id: c.point.id,
              name: c.point.name,
              timeSec: c.route.timeSec,
              lengthM: c.route.lengthM,
            })),
          ),
        )
        setActiveStep(null)
        setStatus('done')
        trackEvent('route_built', { minutes: Math.round(res.best.route.timeSec / 60) })
      } catch (e) {
        if (isAbort(e) || hasCached) return
        setStraight(nearestByStraightLine(next, points, 1)[0] ?? null)
        setStatus('error')
      }
    },
    [points, loadHouse],
  )

  const routeToPoint = useCallback(
    async (id: string) => {
      const target = points.find((p) => p.id === id)
      if (!place || !target) return
      setActiveStep(null)
      setSnap('half')
      const known = routesRef.current.get(id)
      const base = activePlan?.candidates ?? []
      const withTarget = (route: WalkingRoute) =>
        base.some((c) => c.id === id)
          ? base
          : [...base, { id, name: target.name, timeSec: route.timeSec, lengthM: route.lengthM }].sort(
              (a, b) => a.timeSec - b.timeSec,
            )
      if (known) {
        savePlan(buildPlan(place, target, known, withTarget(known)))
        setStatus('done')
        return
      }
      ctrlRef.current?.abort()
      const ctrl = new AbortController()
      ctrlRef.current = ctrl
      setStatus('loading')
      try {
        const route = await walkingRoute(place, target, ctrl.signal)
        routesRef.current.set(id, route)
        savePlan(buildPlan(place, target, route, withTarget(route)))
        setStatus('done')
      } catch (e) {
        if (isAbort(e)) return
        setStraight({ point: target, straightM: haversine(place, target) })
        setStatus('error')
      }
    },
    [place, points, activePlan],
  )

  /** Кнопка «закрыть»: убрать адрес, маршрут и панели дома — вернуться к пустой карте. */
  const clearSelection = useCallback(() => {
    ctrlRef.current?.abort()
    routesRef.current.clear()
    setSelected({ place: null, house: null })
    setStatus('idle')
    setStraight(null)
    setActiveStep(null)
    setHouseLoading(false)
    setHouseUnavailable(false)
    setSnap('peek')
  }, [])

  const pickAt = useCallback(
    async (p: LngLat, source: 'map' | 'geolocation' = 'map') => {
      try {
        select(await reverseGeocode(p, source))
      } catch {
        /* отменено */
      }
    },
    [select],
  )

  const selectHouse = useCallback(
    (id: string) => {
      const h = getDemoHouse(id)
      if (h) select(demoSuggestion(h))
    },
    [select],
  )

  const geoStatusRef = useRef(geo.status)
  geoStatusRef.current = geo.status

  const locate = useCallback(async () => {
    setLocating(true)
    setLocateError(null)
    const pos = await requestLocation()
    setLocating(false)
    if (!pos) {
      setLocateError(
        !('geolocation' in navigator)
          ? t('map.locate.error')
          : geoStatusRef.current === 'denied'
            ? t('map.locate.denied')
            : t('map.locate.error'),
      )
      return
    }
    if (!isInAlmaty(pos)) {
      setLocateError(t('map.locate.outside'))
      return
    }
    await pickAt(pos, 'geolocation')
  }, [pickAt, t])

  // Следим за местоположением, пока открыта карта (синяя точка «Вы здесь»)
  useEffect(() => watchLocation(), [])

  // Разрешили геолокацию — сразу строим маршрут от «Вы здесь»,
  // если адрес ещё не выбран и человек в Алматы
  useEffect(() => {
    if (autoLocatedThisVisit || place || params.get('house') || !geo.position) return
    autoLocatedThisVisit = true
    if (isInAlmaty(geo.position)) void pickAt(geo.position, 'geolocation')
  }, [geo.position, place, params, pickAt])

  // Переход со списка домов: /map?house=<id>
  const houseParam = params.get('house')
  useEffect(() => {
    if (!houseParam) return
    selectHouse(houseParam)
    setParams({}, { replace: true })
  }, [houseParam, selectHouse, setParams])

  const home = useMemo(() => (place ? { lng: place.lng, lat: place.lat } : null), [place])
  const me = useMemo(() => {
    const p = geo.position
    if (!p || (place && haversine(place, p) < 25)) return null
    return { lng: p.lng, lat: p.lat }
  }, [geo.position, place])
  const homeRisk = house ? assessRisk(house).level : null
  const candidateIds = useMemo(() => activePlan?.candidates.map((c) => c.id) ?? [], [activePlan])
  const stepPoints = useMemo(
    () =>
      (activePlan?.maneuvers ?? [])
        .map((m) => activePlan?.coordinates[m.beginIndex])
        .filter((c): c is [number, number] => Boolean(c)),
    [activePlan],
  )
  const highlight = useMemo(() => {
    if (!activePlan?.maneuvers || activeStep === null) return null
    const cur = activePlan.maneuvers[activeStep]
    const nxt = activePlan.maneuvers[activeStep + 1]
    if (!cur) return null
    const end = nxt ? nxt.beginIndex + 1 : activePlan.coordinates.length
    const seg = activePlan.coordinates.slice(cur.beginIndex, Math.max(end, cur.beginIndex + 2))
    return seg.length >= 2 ? seg : null
  }, [activePlan, activeStep])

  // Карта на телефоне лежит и под нижним меню (60 px), и под выдвижной панелью —
  // всё это учитываем в отступах, чтобы маршрут целиком попадал в видимую часть.
  const NAV_H = 60
  const sheetVisible = sheetVisibleHeight(snap === 'full' ? 'half' : snap, sheetAreaH)
  const bottomInset = desktop ? 0 : NAV_H + sheetVisible
  const padding = desktop
    ? { top: 110, right: panelOpen ? 410 : 90, bottom: 60, left: 90 }
    : { top: 124, right: 64, bottom: bottomInset + 24, left: 28 }

  const showOffline = (!online || mapFailed) && Boolean(activePlan)
  const popular = demoHouses.slice(0, 6)

  // ---------- Панели (десктоп — колонка справа, телефон — выдвижная панель) ----------
  const closeButton = (
    <button
      type="button"
      onClick={clearSelection}
      aria-label={t('map.clear')}
      title={t('map.clear')}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-ink hover:text-ink"
    >
      <IconX width={15} height={15} />
    </button>
  )

  const placeCard = (
    <div className="card p-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="cap">{t('map.cap')}</span>
        {points.length > 0 ? (
          <>
            <span className="chip">
              {points.length} {t('map.counter.onMap')}
            </span>
            {reviewCount > 0 && (
              <span className="chip">
                {reviewCount} {t('map.counter.review')}
              </span>
            )}
          </>
        ) : (
          <span className="chip !text-warn-ink">{t('map.noPoints')}</span>
        )}
      </div>

      {place ? (
        <div className="mt-2.5 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-semibold leading-snug">{shortAddress(place.label)}</div>
            {place.subtitle && place.subtitle !== place.label && (
              <div className="truncate text-[13px] text-muted">{place.subtitle}</div>
            )}
          </div>
          {closeButton}
        </div>
      ) : (
        <div className="mt-2.5">
          <h1 className="font-display text-lg font-semibold">{t('map.empty.title')}</h1>
          <p className="mt-1 text-[13px] text-muted">{t('map.empty.body')}</p>
          {geo.status === 'locating' && (
            <p className="mt-2.5 flex items-center gap-2 text-[13px] font-medium text-accent">
              <Spinner /> {t('map.geo.locating')}
            </p>
          )}
          {geo.status === 'denied' && <p className="mt-2.5 text-[13px] text-muted">{t('map.geo.denied')}</p>}
          <p className="cap mt-2.5">{t('map.tapHint')}</p>
        </div>
      )}
      {locateError && <p className="mt-2 text-xs text-signal-ink">{locateError}</p>}
    </div>
  )

  const popularCard = (
    <div className="card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="cap">{t('map.popular')}</span>
        <Link to="/houses" className="cap inline-flex items-center gap-1 !text-accent">
          {t('map.allHouses')}
          <IconArrowRight width={14} height={14} />
        </Link>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {popular.map((h) => {
          const risk = assessRisk(toHouse(h)).level
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => select(demoSuggestion(h))}
                className="flex w-full items-center gap-3 py-2 text-left"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${risk ? RISK_DOT[risk] : 'bg-faint'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{shortAddress(h.address)}</span>
                  <span className="block text-xs text-muted">
                    {h.district} · {h.floors ?? '?'} {t('unit.floors')}
                    {h.year ? ` · ${h.year}` : ''}
                  </span>
                </span>
                {h.route && (
                  <span className="shrink-0 font-mono text-xs font-semibold text-muted">
                    {formatMinutes(h.route.timeSec)} {t('unit.min')}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )

  const routePanel = place && (
    <RoutePanel
      status={status}
      plan={activePlan}
      straight={straight}
      reason={points.length ? 'routing' : 'noPoints'}
      activeStep={activeStep}
      onStep={(i) => {
        setActiveStep(i)
        if (i !== null && !desktop) setSnap('peek')
      }}
      onPickCandidate={routeToPoint}
    />
  )
  const housePanel = place && (
    <HousePanel
      house={house}
      loading={houseLoading}
      unavailable={houseUnavailable}
      onRetry={() => {
        const ctrl = new AbortController()
        ctrlRef.current = ctrl
        loadHouse(place, ctrl.signal)
      }}
    />
  )

  // Десктоп: адрес → маршрут → дом. Телефон: адрес уже в «шапке» панели,
  // поэтому сразу маршрут и дом, карточка с адресом и счётчиками — ниже.
  const panels = (
    <div className="space-y-3">
      {desktop || !place ? placeCard : null}
      {routePanel}
      {housePanel}
      {!desktop && place ? placeCard : null}
      {popularCard}
    </div>
  )

  // Краткая сводка в «шапке» выдвижной панели
  const summary = !place ? (
    <div className="pb-1">
      <div className="font-display text-base font-semibold">{t('map.empty.title')}</div>
      <div className="flex items-center gap-2 text-[13px] text-muted">
        {geo.status === 'locating' ? (
          <>
            <Spinner className="text-accent" /> {t('map.geo.locating')}
          </>
        ) : (
          t('map.sheet.hint')
        )}
      </div>
    </div>
  ) : status === 'loading' ? (
    <div className="flex items-center gap-3 pb-1">
      <Spinner className="text-accent" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{shortAddress(place.label)}</div>
        <div className="text-[13px] text-muted">{t('map.sheet.routing')}</div>
      </div>
      <span onPointerDown={(e) => e.stopPropagation()}>{closeButton}</span>
    </div>
  ) : status === 'done' && activePlan ? (
    <div className="flex items-center gap-2.5 pb-1">
      <div className="flex items-baseline gap-1">
        <span className="font-display text-[1.9rem] font-semibold leading-none">{formatMinutes(activePlan.timeSec)}</span>
        <span className="font-display text-sm font-semibold">{t('unit.min')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {homeRisk && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${RISK_DOT[homeRisk]}`} aria-hidden />}
          <span className="truncate text-[13px] font-semibold text-ink">→ {activePlan.to.name}</span>
        </div>
        <div className="truncate text-xs text-muted">
          {formatDistance(activePlan.lengthM)} · {shortAddress(place.label)}
        </div>
      </div>
      <span onPointerDown={(e) => e.stopPropagation()}>{closeButton}</span>
    </div>
  ) : (
    <div className="flex items-center gap-3 pb-1">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{shortAddress(place.label)}</div>
        <div className="text-[13px] text-signal-ink">{t('map.route.unavailable')}</div>
      </div>
      <span onPointerDown={(e) => e.stopPropagation()}>{closeButton}</span>
    </div>
  )

  return (
    <div className="relative h-[calc(100dvh-4rem)] overflow-hidden">
      {/* ---------- Карта ---------- */}
      <div className="absolute inset-0">
        {showOffline && activePlan ? (
          <div className="grid h-full place-items-center overflow-y-auto bg-mm p-4">
            <div className="w-full max-w-md">
              <p className="cap mb-2 flex items-center gap-2">
                <IconWifiOff width={16} height={16} />
                {t('map.offline')}
              </p>
              <OfflinePlan plan={activePlan} />
            </div>
          </div>
        ) : mapFailed ? (
          <div className="grid h-full place-items-center bg-mm p-6 text-center">
            <p className="cap">{t('map.failed')}</p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="grid h-full place-items-center bg-mm text-muted">
                <Spinner />
              </div>
            }
          >
            <CityMap
              points={points}
              houses={mapHouses}
              selectedHouseId={place?.houseId ?? null}
              home={home}
              me={me}
              homeRisk={homeRisk}
              fastestId={activePlan?.to.id ?? null}
              candidateIds={candidateIds}
              route={activePlan?.coordinates ?? null}
              stepPoints={stepPoints}
              highlight={highlight}
              padding={padding}
              bottomInset={bottomInset}
              controlsClassName="right-3 top-[88px] md:left-4 md:right-auto md:top-auto md:bottom-10"
              onPick={pickAt}
              onHouseClick={selectHouse}
              onRouteToPoint={routeToPoint}
              onLocate={locate}
              locating={locating}
              onError={() => setMapFailed(true)}
            />
          </Suspense>
        )}
      </div>

      {/* ---------- Поиск ---------- */}
      <div className="glass absolute inset-x-3 top-3 z-20 p-2.5 md:left-4 md:right-auto md:top-4 md:w-[440px] md:p-3">
        <AddressSearch onSelect={select} initialValue={place?.label ?? ''} />
        <p className="cap mt-2 hidden md:block">{t('map.search.hint')}</p>
      </div>

      {desktop ? (
        panelOpen ? (
          <aside
            data-lenis-prevent
            className="absolute bottom-4 right-4 top-4 z-10 flex w-[360px] flex-col overflow-hidden rounded-3xl"
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/95 px-3 py-1.5 text-xs font-semibold text-muted shadow-card backdrop-blur hover:text-ink"
              >
                {t('map.panel.hide')}
                <IconChevronDown width={14} height={14} className="-rotate-90" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-3xl">{panels}</div>
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="absolute right-4 top-4 z-10 inline-flex max-w-[320px] items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold shadow-lift hover:border-ink"
          >
            <IconChevronDown width={15} height={15} className="rotate-90" />
            <span className="truncate">
              {activePlan && place
                ? `${formatMinutes(activePlan.timeSec)} ${t('unit.min')} → ${activePlan.to.name}`
                : t('map.panel.show')}
            </span>
          </button>
        )
      ) : (
        <div
          ref={sheetAreaRef}
          className="pointer-events-none absolute inset-x-0 top-0 z-30"
          style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))' }}
        >
          {sheetAreaH > 0 && (
            <BottomSheet snap={snap} onSnapChange={setSnap} areaHeight={sheetAreaH} header={summary}>
              {panels}
            </BottomSheet>
          )}
        </div>
      )}
    </div>
  )
}
