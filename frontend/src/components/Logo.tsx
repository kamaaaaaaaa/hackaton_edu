interface LogoProps {
  className?: string
  showWordmark?: boolean
  /** Размер знака в px. */
  size?: number
}

/** Вордмарк «Готов к толчку»: знак-пульс сейсмографа + текст. */
export function Logo({ className = '', showWordmark = true, size = 30 }: LogoProps) {
  return (
    <span className={`inline-flex select-none items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label="Готов к толчку"
        className="shrink-0"
      >
        <rect width="64" height="64" rx="16" fill="#0B1437" />
        <path
          d="M6 34 H18 L23 24 L29 44 L35 14 L41 40 L46 34 H58"
          fill="none"
          stroke="#3B6BFF"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span className="font-display text-[1.05rem] font-extrabold leading-none tracking-tight text-navy-900">
          Готов&nbsp;к&nbsp;толчку
        </span>
      )}
    </span>
  )
}
