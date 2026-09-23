/** Знак: сейсмограмма кислотным лаймом на чернильном квадрате. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="16" fill="#111113" />
      <path
        d="M6 34 H18 L23 24 L29 44 L35 14 L41 40 L46 34 H58"
        fill="none"
        stroke="#D4FF3A"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Вордмарк «Готов к толчку». */
export function Logo({ size = 30, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="inline-flex select-none items-center gap-2.5">
      <LogoMark size={size} />
      {wordmark && (
        <span className="font-display text-[15px] font-semibold leading-none tracking-[-0.02em] text-ink">
          Готов&nbsp;к&nbsp;толчку
        </span>
      )}
    </span>
  )
}
