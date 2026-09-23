import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Шрифты самохостятся (кириллица есть у всех трёх): быстрее и работают офлайн
import '@fontsource-variable/unbounded'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import '@/lib/install' // ранний перехват beforeinstallprompt
import App from './App'
import { I18nProvider } from './i18n'
import { AlertProvider } from './store/alert'
import { AuthProvider } from './store/auth'
import { MotionProvider } from './motion/MotionProvider'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <AlertProvider>
            <MotionProvider>
              <App />
            </MotionProvider>
          </AlertProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
