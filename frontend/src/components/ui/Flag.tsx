import { useId, type ReactNode } from 'react'

// Флаги для выбора языка. «Развевание» — только transform: флаг нарезан на
// вертикальные полосы, каждая качается по синусоиде со сдвигом фазы, и по
// ткани бежит блик. При prefers-reduced-motion флаг стоит ровно.

const W = 36
const H = 24
const SLICES = 9

const GOLD = '#FEC50C'

function Kazakhstan() {
  const rays = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2
    const r1 = 4.3
    const r2 = i % 2 ? 5.6 : 6.4
    return (
      <line
        key={i}
        x1={19.5 + r1 * Math.cos(a)}
        y1={9.4 + r1 * Math.sin(a)}
        x2={19.5 + r2 * Math.cos(a)}
        y2={9.4 + r2 * Math.sin(a)}
      />
    )
  })
  return (
    <g>
      <rect width={W} height={H} fill="#00AFCA" />
      {/* Национальный орнамент «қошқар мүйіз» у древка — упрощённо */}
      <g fill="none" stroke={GOLD} strokeWidth={0.7} strokeLinecap="round">
        {[3, 8, 13, 18].map((y) => (
          <path key={y} d={`M2.2 ${y + 1.2}c.8-1.6 2.4-1.6 3.2 0M2.2 ${y + 1.2}c.8 1.6 2.4 1.6 3.2 0M3.8 ${y - 0.4}v3.2`} />
        ))}
      </g>
      {/* Солнце */}
      <g stroke={GOLD} strokeWidth={0.75} strokeLinecap="round">
        {rays}
      </g>
      <circle cx={19.5} cy={9.4} r={3.4} fill={GOLD} />
      {/* Степной орёл */}
      <path
        d="M10.8 16.3c3-1.7 6.2-1.3 8.7 1 2.5-2.3 5.7-2.7 8.7-1-2.8.3-5.6 1.2-8.7 3.1-3.1-1.9-5.9-2.8-8.7-3.1Z"
        fill={GOLD}
      />
    </g>
  )
}

function Russia() {
  return (
    <g>
      <rect width={W} height={H / 3} fill="#FFFFFF" />
      <rect y={H / 3} width={W} height={H / 3} fill="#0039A6" />
      <rect y={(2 * H) / 3} width={W} height={H / 3} fill="#D52B1E" />
    </g>
  )
}

const FLAGS: Record<'kk' | 'ru', () => ReactNode> = { kk: Kazakhstan, ru: Russia }

export function Flag({
  code,
  width = 27,
  wave = true,
  className = '',
}: {
  code: 'kk' | 'ru'
  width?: number
  wave?: boolean
  className?: string
}) {
  const uid = useId().replace(/:/g, '')
  const Art = FLAGS[code]
  const sliceW = W / SLICES
  return (
    <svg
      viewBox={`0 -2 ${W} ${H + 4}`}
      width={width}
      height={(width * (H + 4)) / W}
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden
    >
      <defs>
        <clipPath id={`${uid}-r`}>
          <rect width={W} height={H} rx={3} />
        </clipPath>
        {wave &&
          Array.from({ length: SLICES }, (_, i) => (
            <clipPath key={i} id={`${uid}-s${i}`}>
              <rect x={i * sliceW - 0.05} y={-3} width={sliceW + 0.1} height={H + 6} />
            </clipPath>
          ))}
        <linearGradient id={`${uid}-g`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {wave ? (
        Array.from({ length: SLICES }, (_, i) => (
          <g key={i} clipPath={`url(#${uid}-s${i})`}>
            <g className="flag-wave" style={{ animationDelay: `${-i * 0.14}s` }}>
              <g clipPath={`url(#${uid}-r)`}>
                <Art />
              </g>
              <rect width={W} height={H} rx={3} fill="none" stroke="rgba(17,17,19,0.14)" strokeWidth={0.8} />
            </g>
          </g>
        ))
      ) : (
        <g>
          <g clipPath={`url(#${uid}-r)`}>
            <Art />
          </g>
          <rect width={W} height={H} rx={3} fill="none" stroke="rgba(17,17,19,0.14)" strokeWidth={0.8} />
        </g>
      )}

      {/* Блик бежит по ткани */}
      {wave && (
        <g clipPath={`url(#${uid}-r)`}>
          <rect className="flag-shine" x={-14} width={14} height={H} fill={`url(#${uid}-g)`} />
        </g>
      )}
    </svg>
  )
}
