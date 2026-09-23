import { useEffect, useState } from 'react'

/** Алфавит кодов семьи на бэкенде: без 0/O и 1/I/L — их легко спутать. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6

export function cleanCode(raw: string): { code: string; rejected: boolean } {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').split('')
  const ok = chars.filter((c) => CODE_ALPHABET.includes(c))
  return { code: ok.join('').slice(0, CODE_LENGTH), rejected: ok.length < chars.length }
}

/**
 * Код семьи — шесть клеток. Под клетками одно настоящее поле ввода:
 * работает вставка, автозаполнение и экранные клавиатуры.
 */
export function CodeInput({
  id,
  value,
  onChange,
  onReject,
  describedBy,
}: {
  id: string
  value: string
  onChange: (code: string) => void
  /** Ввели символ не из алфавита (0, O, 1, I, L…). */
  onReject?: () => void
  describedBy?: string
}) {
  const [focused, setFocused] = useState(false)
  const [blink, setBlink] = useState(true)
  useEffect(() => {
    if (!focused) return
    const timer = window.setInterval(() => setBlink((b) => !b), 530)
    return () => window.clearInterval(timer)
  }, [focused])
  const active = Math.min(value.length, CODE_LENGTH - 1)

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => {
          const { code, rejected } = cleanCode(e.target.value)
          if (rejected) onReject?.()
          onChange(code)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-describedby={describedBy}
        className="absolute inset-0 z-10 h-full w-full cursor-text rounded-2xl opacity-0"
      />
      <div aria-hidden className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const ch = value[i]
          const isActive = focused && i === active && value.length < CODE_LENGTH
          return (
            <span
              key={i}
              className={`relative grid h-14 place-items-center rounded-2xl border-2 bg-surface font-mono text-2xl font-bold text-ink transition-colors ${
                isActive ? 'border-accent' : ch ? 'border-ink' : 'border-line'
              }`}
            >
              {ch ?? ''}
              {isActive && !ch && (
                <span className={`absolute h-7 w-0.5 rounded bg-accent ${blink ? 'opacity-100' : 'opacity-0'}`} />
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
