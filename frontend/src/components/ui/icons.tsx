// Линейные иконки 24×24, stroke = currentColor. Без сторонних библиотек и эмодзи.
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export const IconHome = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9h12v-9" />
  </svg>
)

export const IconMap = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" />
    <circle cx="12" cy="11" r="2.2" />
  </svg>
)

export const IconUsers = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6" />
    <path d="M17.5 13.4A5.5 5.5 0 0 1 20.5 19" />
  </svg>
)

export const IconGauge = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 16a8 8 0 1 1 15 0" />
    <path d="m12 14 3.5-4.5" />
    <circle cx="12" cy="14.5" r="1" />
  </svg>
)

export const IconTimer = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="13.5" r="7" />
    <path d="M12 13.5V10" />
    <path d="M9.5 3h5" />
    <path d="m18 6.5 1.4-1.4" />
  </svg>
)

export const IconPulse = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 12h4l2.5-6 4 13 3-9 1.5 2H22" />
  </svg>
)

export const IconSearch = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
)

export const IconCrosshair = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <circle cx="12" cy="12" r="1.5" />
  </svg>
)

export const IconRoute = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="6" cy="18" r="2.4" />
    <circle cx="18" cy="6" r="2.4" />
    <path d="M8 17h6a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h1" />
  </svg>
)

export const IconArrowRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
)

export const IconShare = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 15V3" />
    <path d="m7.5 7.5 4.5-4.5 4.5 4.5" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
)

export const IconDownload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v12" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M5 19h14" />
  </svg>
)

export const IconX = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

export const IconAlert = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 10v4" />
    <path d="M12 17.5v.5" />
  </svg>
)

export const IconCopy = (p: P) => (
  <svg {...base} {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
)

export const IconPhone = (p: P) => (
  <svg {...base} {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </svg>
)

export const IconWifiOff = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 3l18 18" />
    <path d="M8.5 16.5a5 5 0 0 1 7 0" />
    <path d="M5 12.5a10 10 0 0 1 4-2.3M19 12.5a10 10 0 0 0-3.2-2" />
    <circle cx="12" cy="20" r="0.8" />
  </svg>
)

export const IconBuilding = (p: P) => (
  <svg {...base} {...p}>
    <rect x="5" y="3" width="14" height="18" rx="1.5" />
    <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
  </svg>
)

export const IconPlus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconMinus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
  </svg>
)

/** Стрелка компаса: красная половина смотрит на север. */
export const IconCompass = (p: P) => (
  <svg {...base} strokeWidth={0} {...p}>
    <path d="M12 3 15.2 12H8.8L12 3Z" fill="#FF3B1F" />
    <path d="M12 21 8.8 12h6.4L12 21Z" fill="currentColor" opacity={0.35} />
  </svg>
)

export const IconWalk = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="13" cy="4.5" r="1.8" />
    <path d="m9.5 21 2.2-6.2L14 17v4" />
    <path d="M8 11.5 10.5 8l3 .7 2 3.3 2.5 1" />
    <path d="m10.5 8-1 5 2.2 1.8" />
  </svg>
)

export const IconLayers = (p: P) => (
  <svg {...base} {...p}>
    <path d="m12 4 8 4.5-8 4.5-8-4.5L12 4Z" />
    <path d="m4 13 8 4.5 8-4.5" />
  </svg>
)

export const IconSparkle = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5Z" />
    <path d="M19 16.5c.25 1.4.85 2 2.25 2.25-1.4.25-2 .85-2.25 2.25-.25-1.4-.85-2-2.25-2.25 1.4-.25 2-.85 2.25-2.25Z" />
  </svg>
)

export const IconExternal = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 5h5v5" />
    <path d="M19 5 11 13" />
    <path d="M18 14v5H5V6h5" />
  </svg>
)

export const IconChevronDown = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const IconList = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </svg>
)
