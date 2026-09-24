import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { reverseGeocode, searchAddress, type AddressSuggestion, type SearchOutcome } from '@/api'
import { isInAlmaty, requestLocation, useGeo } from '@/store/geo'
import { useI18n } from '@/i18n'
import { IconCrosshair, IconSearch } from '@/components/ui/icons'
import { Spinner } from '@/components/ui/motion'

type Status = 'idle' | 'loading' | 'done' | 'error'

/** Поиск адреса: дома из списка → Photon (OSM) → Nominatim (TomTom — по желанию); геолокация. Debounce 300 мс. */
export function AddressSearch({
  onSelect,
  initialValue = '',
  dropUp = false,
}: {
  onSelect: (s: AddressSuggestion) => void
  initialValue?: string
  /** Список над полем — когда поиск прижат к низу экрана (телефон). */
  dropUp?: boolean
}) {
  const { t } = useI18n()
  const geo = useGeo()
  const [query, setQuery] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<SearchOutcome>({ items: [], source: 'none' })
  const [active, setActive] = useState(-1)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const cache = useRef(new Map<string, SearchOutcome>())
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => setQuery(initialValue), [initialValue])

  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 3) {
      setStatus('idle')
      return
    }
    const cached = cache.current.get(q.toLowerCase())
    if (cached) {
      setResult(cached)
      setStatus('done')
      return
    }
    const ctrl = new AbortController()
    setStatus('loading')
    const id = window.setTimeout(() => {
      searchAddress(q, ctrl.signal)
        .then((res) => {
          cache.current.set(q.toLowerCase(), res)
          setResult(res)
          setActive(-1)
          setStatus('done')
        })
        .catch((e) => {
          if ((e as { name?: string })?.name !== 'AbortError') setStatus('error')
        })
    }, 300)
    return () => {
      window.clearTimeout(id)
      ctrl.abort()
    }
  }, [query, open])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const choose = (s: AddressSuggestion) => {
    setQuery(s.title)
    setOpen(false)
    onSelect(s)
  }

  const locate = async () => {
    setLocating(true)
    setLocateError(null)
    const pos = await requestLocation()
    if (!pos) {
      setLocating(false)
      setLocateError(geo.status === 'denied' ? t('map.locate.denied') : t('map.locate.error'))
      return
    }
    if (!isInAlmaty(pos)) {
      setLocating(false)
      setLocateError(t('map.locate.outside'))
      return
    }
    try {
      choose(await reverseGeocode(pos, 'geolocation'))
    } finally {
      setLocating(false)
    }
  }

  const items = result.items
  const showList = open && query.trim().length >= 3 && status !== 'idle'

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showList || !items.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      choose(items[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="address-search" className="sr-only">
            {t('map.search.label')}
          </label>
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" width={20} height={20} />
          <input
            id="address-search"
            role="combobox"
            aria-expanded={showList}
            aria-controls="address-list"
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `addr-${active}` : undefined}
            autoComplete="off"
            enterKeyHint="search"
            className="field min-h-[52px] pl-11 pr-10"
            placeholder={t('map.search.placeholder')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          {status === 'loading' && (
            <Spinner className="absolute right-4 top-1/2 -translate-y-1/2 text-accent" />
          )}
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          aria-label={t('map.locate')}
          title={t('map.locate')}
          className="btn btn-ink min-h-[52px] w-[52px] shrink-0 px-0"
        >
          {locating ? <Spinner /> : <IconCrosshair width={21} height={21} />}
        </button>
      </div>

      {locateError && <p className="mt-2 text-sm font-medium text-signal-ink">{locateError}</p>}

      {showList && (
        <div
          data-search-dropdown
          data-state={status}
          className={`absolute z-30 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-lift ${
            dropUp ? 'bottom-full mb-2' : 'mt-2'
          }`}
        >
          {status === 'loading' && items.length === 0 && (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
              <Spinner className="text-accent" />
              {t('misc.loading')}
            </p>
          )}
          {status === 'error' && <p className="px-4 py-3 text-sm text-signal-ink">{t('map.search.error')}</p>}
          {status === 'done' && items.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted">{t('map.search.empty')}</p>
          )}
          {items.length > 0 && status !== 'error' && (
            <ul
              id="address-list"
              role="listbox"
              className={`overflow-auto py-1 ${dropUp ? 'max-h-[min(20rem,42vh)]' : 'max-h-80'}`}
              data-lenis-prevent
            >
              {items.map((s, i) => (
                <li
                  key={s.id}
                  id={`addr-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onClick={() => choose(s)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${i === active ? 'bg-paper' : ''}`}
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{s.title}</span>
                    <span className="block truncate text-xs text-muted">{s.subtitle}</span>
                  </span>
                  {s.district && <span className="chip shrink-0 !px-2 !py-0.5">{s.district}</span>}
                </li>
              ))}
            </ul>
          )}
          {result.source === 'nominatim' && items.length > 0 && (
            <p className="cap border-t border-line px-4 py-2">{t('map.search.viaOsm')}</p>
          )}
        </div>
      )}
    </div>
  )
}
