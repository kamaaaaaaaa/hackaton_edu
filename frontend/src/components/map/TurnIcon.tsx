import type { TurnKind } from '@/lib/maneuver'

// Стрелка манёвра, как в навигаторах: ствол снизу и поворот в нужную сторону.
const ANGLE: Partial<Record<TurnKind, number>> = {
  straight: 0,
  'slight-right': 45,
  right: 90,
  'sharp-right': 135,
  'slight-left': -45,
  left: -90,
  'sharp-left': -135,
}

const rad = (d: number) => (d * Math.PI) / 180

function bent(angle: number) {
  const a = rad(angle)
  const ex = 12 + 7.5 * Math.sin(a)
  const ey = 11 - 7.5 * Math.cos(a)
  const head = (da: number) => {
    const b = a + Math.PI + rad(da)
    return `${(ex + 4.2 * Math.sin(b)).toFixed(2)} ${(ey - 4.2 * Math.cos(b)).toFixed(2)}`
  }
  return (
    <>
      <path d={`M12 21v-${angle === 0 ? 16 : 10}${angle === 0 ? '' : `L${ex.toFixed(2)} ${ey.toFixed(2)}`}`} />
      <path d={`M${head(-38)}L${ex.toFixed(2)} ${(angle === 0 ? 5 : ey).toFixed(2)}L${head(38)}`} />
    </>
  )
}

export function TurnIcon({ kind, className = '' }: { kind: TurnKind; className?: string }) {
  let body
  if (kind === 'start') {
    body = (
      <>
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="2.6" fill="currentColor" />
      </>
    )
  } else if (kind === 'finish') {
    body = (
      <>
        <path d="M6 21V4" />
        <path d="M6 4.5h11l-2.5 4 2.5 4H6" />
      </>
    )
  } else if (kind === 'uturn') {
    body = (
      <>
        <path d="M8 21V10a4 4 0 0 1 8 0v7" />
        <path d="m12.5 14 3.5 3.5 3.5-3.5" />
      </>
    )
  } else if (kind === 'stairs') {
    body = <path d="M4 19h4v-4h4v-4h4V7h4" />
  } else {
    body = bent(ANGLE[kind] ?? 0)
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {body}
    </svg>
  )
}
