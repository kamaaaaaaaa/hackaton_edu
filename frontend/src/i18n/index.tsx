import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ru, type TranslationKey } from './ru'
import { kk } from './kk'
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage'

export type Lang = 'ru' | 'kk'

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { ru, kk }

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    readJSON<Lang>(STORAGE_KEYS.lang, 'ru') === 'kk' ? 'kk' : 'ru',
  )

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    writeJSON(STORAGE_KEYS.lang, next)
    try {
      document.documentElement.lang = next
    } catch {
      /* noop */
    }
  }, [])

  const toggle = useCallback(
    () => setLang(lang === 'ru' ? 'kk' : 'ru'),
    [lang, setLang],
  )

  const t = useCallback(
    (key: TranslationKey) => dictionaries[lang][key] ?? ru[key] ?? key,
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n должен использоваться внутри I18nProvider')
  return ctx
}

export type { TranslationKey }
