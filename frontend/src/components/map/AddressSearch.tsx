import { useEffect, useRef, useState } from 'react'
import { useAddressSearch, type AddressSuggestion } from '@/lib/nominatim'
import { useI18n } from '@/i18n'
import { Spinner } from '../Spinner'

function SearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

function PinGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 shrink-0 text-navy-500" aria-hidden="true">
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  )
}

interface Props {
  onSelect: (suggestion: AddressSuggestion) => void
}

/** Поле поиска адреса с debounce-подсказками Nominatim. */
export function AddressSearch({ onSelect }: Props) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { results, loading, error } = useAddressSearch(query)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const choose = (s: AddressSuggestion) => {
    onSelect(s)
    setQuery(s.shortLabel)
    setOpen(false)
  }

  const showDropdown = open && query.trim().length >= 3

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('map.search.placeholder')}
          className="field pr-11"
          autoComplete="off"
          type="search"
          aria-label={t('map.search.placeholder')}
        />
        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-subink">
          {loading ? <Spinner /> : <SearchGlyph />}
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[11px] leading-snug text-subink/80">{t('map.search.hint')}</p>

      {showDropdown && (
        <div className="absolute z-[500] mt-2 w-full overflow-hidden rounded-2xl border border-line bg-white shadow-lift animate-fade-up">
          {error && <div className="px-4 py-3 text-sm text-risk-high">{t('misc.error')}</div>}
          {!error && !loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-subink">{t('map.search.empty')}</div>
          )}
          <ul className="max-h-72 overflow-auto">
            {results.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  onClick={() => choose(s)}
                  className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition hover:bg-mist"
                >
                  <PinGlyph />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{s.shortLabel}</span>
                    <span className="block truncate text-xs text-subink">{s.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
