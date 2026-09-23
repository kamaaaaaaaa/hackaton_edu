import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { BottomNav } from './BottomNav'
import { AlertBanner } from './AlertBanner'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-cloud">
      <Header />
      <main className="flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      <AlertBanner />
    </div>
  )
}
