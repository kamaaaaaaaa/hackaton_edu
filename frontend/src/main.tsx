import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App'
import { I18nProvider } from './i18n'
import { AlertProvider } from './store/alert'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AlertProvider>
          <App />
        </AlertProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
