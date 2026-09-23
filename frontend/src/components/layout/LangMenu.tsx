import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useI18n, type Lang } from '@/i18n'
import { Flag } from '@/components/ui/Flag'
import { IconCheck, IconChevronDown } from '@/components/ui/icons'

const OPTIONS: { code: Lang; short: string; name: string }[] = [
  { code: 'kk', short: 'KK', name: 'Қазақша' },
  { code: 'ru', short: 'RU', name: 'Русский' },
]

/** Выбор языка: развевающийся флаг | код языка, выпадающий список. */
export function LangMenu() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const current = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[1]

  useEffect(() => {
    if (!open) return
    setActive(Math.max(0, OPTIONS.findIndex((o) => o.code === lang)))
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, lang])

  const choose = (code: Lang) => {
    setLang(code)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      buttonRef.current?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : OPTIONS.length - 1)) % OPTIONS.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(OPTIONS[active].code)
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('lang.switch')}: ${current.name}`}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line bg-surface py-1 pl-2 pr-2.5 transition-colors hover:border-ink"
      >
        <Flag code={current.code} width={26} />
        <span className="h-4 w-px bg-line" aria-hidden />
        <span className="font-mono text-[12px] font-bold tracking-[0.06em] text-ink">{current.short}</span>
        <IconChevronDown
          width={14}
          height={14}
          className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <m.ul
            role="listbox"
            aria-label={t('lang.switch')}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 origin-top-right overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-lift"
          >
            {OPTIONS.map((o, i) => {
              const selected = o.code === lang
              return (
                <li
                  key={o.code}
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(o.code)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${
                    i === active ? 'bg-paper' : ''
                  }`}
                >
                  <Flag code={o.code} width={30} />
                  <span className="h-5 w-px bg-line" aria-hidden />
                  <span className="font-mono text-[12px] font-bold text-ink">{o.short}</span>
                  <span className="flex-1 text-sm text-muted">{o.name}</span>
                  {selected && <IconCheck width={16} height={16} className="text-accent" />}
                </li>
              )
            })}
          </m.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
