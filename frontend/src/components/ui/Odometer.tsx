import { useRef } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

const ROLL_MS = 1400
const REPEATS = 3 // лента 0–9 ×3 — цифра «прокручивается» пару кругов

function Digit({
  digit,
  show,
  delay,
  jitter,
  instant,
}: {
  digit: number
  show: boolean
  delay: number
  jitter: boolean
  instant: boolean
}) {
  const target = show ? (REPEATS - 1) * 10 + digit : 0
  return (
    <span
      aria-hidden
      className={`relative inline-block h-[1em] w-[1ch] overflow-hidden ${jitter && show ? 'animate-jitter' : ''}`}
      style={jitter ? { animationDelay: `${delay + ROLL_MS}ms` } : undefined}
    >
      <span
        className="absolute left-0 top-0 flex flex-col"
        style={{
          transform: `translate3d(0, ${-target}em, 0)`,
          transition: instant ? 'none' : `transform ${ROLL_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        }}
      >
        {Array.from({ length: REPEATS * 10 }, (_, k) => (
          <span key={k} className="block h-[1em] leading-[1em]">
            {k % 10}
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * Число-табло: моноширинные цифры прокручиваются при появлении в зоне
 * видимости (одометр), последняя цифра потом слегка «дрожит» — как стрелка
 * сейсмографа. Только transform. Для скринридеров — обычный текст.
 */
export function Odometer({
  value,
  pad = 0,
  suffix,
  className = '',
  jitter = true,
}: {
  value: number | string
  pad?: number
  suffix?: string
  className?: string
  jitter?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })
  const reduce = useReducedMotion() ?? false
  const text = typeof value === 'number' ? String(Math.round(value)).padStart(pad, '0') : value
  const show = inView || reduce
  const lastDigitIndex = text.search(/\d(?!.*\d)/)

  return (
    <span ref={ref} className={`inline-flex items-baseline font-mono leading-none ${className}`}>
      <span className="sr-only">
        {text}
        {suffix ?? ''}
      </span>
      {text.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <Digit
            key={i}
            digit={Number(ch)}
            show={show}
            delay={i * 80}
            jitter={jitter && i === lastDigitIndex}
            instant={reduce}
          />
        ) : (
          <span key={i} aria-hidden className="inline-block">
            {ch}
          </span>
        ),
      )}
      {suffix && (
        <span aria-hidden className="ml-[0.06em]">
          {suffix}
        </span>
      )}
    </span>
  )
}
