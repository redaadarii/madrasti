import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/i18n'
import { App } from '@/app/app'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Application installable (PWA) : uniquement en production pour ne pas gêner le rechargement à chaud.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
}
