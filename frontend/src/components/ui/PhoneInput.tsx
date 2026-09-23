import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { caretAfterDigit, digitsBefore, formatNational, nationalDigits } from '@/lib/phone'

/**
 * Телефон с маской «+7 (7XX) XXX-XX-XX»: цифры встают на места сами,
 * Backspace перепрыгивает скобки и дефисы, вставка «8 701 …» тоже работает.
 * value — 10 цифр национального номера.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  invalid = false,
  describedBy,
}: {
  id: string
  value: string
  onChange: (digits: string) => void
  invalid?: boolean
  describedBy?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  const [focused, setFocused] = useState(false)
  // В фокусе сразу видна маска «+7 (» — ясно, что код страны вводить не нужно
  const display = formatNational(value) || (focused ? '+7 (' : '')

  useLayoutEffect(() => {
    const el = ref.current
    if (el && caret.current !== null && document.activeElement === el) {
      el.setSelectionRange(caret.current, caret.current)
    }
    caret.current = null
  })

  const commit = (digits: string, digitIndex: number) => {
    caret.current = caretAfterDigit(formatNational(digits) || '+7 (', digitIndex)
    onChange(digits)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    if (start !== end) return
    if (e.key === 'Backspace' && start > 0 && !/\d/.test(display[start - 1] ?? '')) {
      // Курсор за скобкой или дефисом — удаляем предыдущую цифру, а не символ маски
      e.preventDefault()
      const i = digitsBefore(display, start)
      if (i > 0) commit(value.slice(0, i - 1) + value.slice(i), i - 1)
    } else if (e.key === 'Delete' && start < display.length && !/\d/.test(display[start] ?? '')) {
      e.preventDefault()
      const i = digitsBefore(display, start)
      if (i < value.length) commit(value.slice(0, i) + value.slice(i + 1), i)
    }
  }

  return (
    <input
      ref={ref}
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      className={`field font-mono tracking-wide ${invalid ? '!border-signal' : ''}`}
      placeholder="+7 (7__) ___-__-__"
      value={display}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value
        const pos = e.target.selectionStart ?? raw.length
        const digits = nationalDigits(raw)
        const before = nationalDigits(raw.slice(0, pos)).length
        commit(digits, Math.min(before, digits.length))
      }}
    />
  )
}
