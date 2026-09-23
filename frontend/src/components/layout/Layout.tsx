import { Suspense, useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { Header } from './Header'
import { Footer } from './Footer'
import { BottomNav } from './BottomNav'
import { AlertOverlay } from './AlertOverlay'
import { GeoToast } from './GeoToast'
import { useAlert } from '@/store/alert'
import { Spinner } from '@/components/ui/motion'

/** Плавный скролл Lenis. Выключен при prefers-reduced-motion; карта помечена data-lenis-prevent. */
function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    let destroyed = false
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null
    import('lenis').then(({ default: Lenis }) => {
      if (destroyed) return
      lenis = new Lenis({ duration: 1.05, smoothWheel: true })
      const loop = (t: number) => {
        lenis?.raf(t)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    })
    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      lenis?.destroy()
    }
  }, [])
}

/** Замораживает элемент маршрута, чтобы уходящий экран не подменялся новым во время анимации. */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

function PageFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-muted">
      <Spinner />
    </div>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  const { active } = useAlert()
  const isMap = pathname === '/map'

  useSmoothScroll()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-mm">
      <div id="app-shell" className={`flex flex-1 flex-col ${active ? 'quake' : ''}`}>
        <Header />
        <AnimatePresence mode="wait" initial={false}>
          <m.main
            key={pathname}
            className={`flex-1 ${isMap ? '' : 'pb-24 md:pb-0'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<PageFallback />}>
              <FrozenOutlet />
            </Suspense>
          </m.main>
        </AnimatePresence>
        {!isMap && <Footer />}
      </div>
      <BottomNav />
      <GeoToast />
      <AlertOverlay />
    </div>
  )
}
