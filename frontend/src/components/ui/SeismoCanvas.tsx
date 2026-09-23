import { useEffect, useRef } from 'react'

/**
 * Живая линия сейсмографа на canvas. Амплитуда растёт у курсора (гауссов «бугор»),
 * без курсора по линии сама пробегает волна. Это визуализация, а не данные.
 * Пауза вне экрана и во фоновой вкладке; при reduced motion — статичный кадр.
 */
export function SeismoCanvas({
  className = '',
  color = '#111113',
  accent = '#5B3DF5',
  interactive = true,
}: {
  className?: string
  color?: string
  accent?: string
  interactive?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let raf = 0
    let running = false
    let visible = false
    const pointer = { x: -9999, active: false, amp: 0 }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      const mid = h * 0.55
      const travel = ((t * 0.09) % (w + 500)) - 250
      let headY = mid

      ctx.beginPath()
      for (let x = 0; x <= w; x += 2) {
        let y =
          Math.sin(x * 0.043 + t * 0.0042) * 1.3 +
          Math.sin(x * 0.127 - t * 0.0068) * 0.8 +
          Math.sin(x * 0.31 + t * 0.011) * 0.45

        const dc = (x - pointer.x) / 85
        const near = Math.exp(-dc * dc) * pointer.amp
        y += near * (Math.sin(x * 0.42 + t * 0.03) * 0.85 + Math.sin(x * 0.9 - t * 0.05) * 0.35) * (h * 0.34)

        const dt = (x - travel) / 55
        const wave = Math.exp(-dt * dt) * (1 - pointer.amp * 0.8) * 0.5
        y += wave * Math.sin(x * 0.55 + t * 0.022) * (h * 0.3)

        if (Math.abs(x - travel) < 2) headY = mid + y
        if (x === 0) ctx.moveTo(x, mid + y)
        else ctx.lineTo(x, mid + y)
      }
      ctx.lineWidth = 1.6
      ctx.lineJoin = 'round'
      ctx.strokeStyle = color
      ctx.stroke()

      // «Перо» самописца на бегущей волне
      if (travel > 0 && travel < w) {
        ctx.beginPath()
        ctx.arc(travel, headY, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = accent
        ctx.fill()
      }
    }

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = r.width
      h = r.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(performance.now())
    }

    const loop = (t: number) => {
      pointer.amp += ((pointer.active ? 1 : 0) - pointer.amp) * 0.06
      draw(t)
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (running || reduce || !visible || document.hidden) return
      running = true
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else stop()
    })
    io.observe(canvas)
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      pointer.x = e.clientX - r.left
      pointer.active = e.clientY > r.top - 140 && e.clientY < r.bottom + 140
    }
    const onLeave = () => {
      pointer.active = false
    }
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)
    }

    resize()
    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [color, accent, interactive])

  return <canvas ref={ref} className={`block w-full ${className}`} aria-hidden="true" />
}
