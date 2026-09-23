import type { ReactNode } from 'react'
import { m } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

/** Текст появляется по буквам (opacity + transform). Скринридер читает строку целиком. */
export function SplitText({
  text,
  delay = 0,
  stagger = 0.018,
  className = '',
}: {
  text: string
  delay?: number
  stagger?: number
  className?: string
}) {
  let index = 0
  const words = text.split(' ')
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, wi) => (
          <span key={wi} className="inline-block whitespace-nowrap">
            {Array.from(word).map((ch) => {
              const i = index++
              return (
                <m.span
                  key={i}
                  className="inline-block"
                  initial={{ opacity: 0, y: '0.4em' }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: EASE, delay: delay + i * stagger }}
                >
                  {ch}
                </m.span>
              )
            })}
            {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
          </span>
        ))}
      </span>
    </span>
  )
}

/** Секция проявляется при появлении в зоне видимости. */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className = '',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </m.div>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
