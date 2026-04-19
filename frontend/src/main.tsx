import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// ── Setup order matters — interceptors must load before any API call ──────
import './utils/httpsInterceptor'   // HTTPS enforcer (must stay first)
import './utils/axiosSetup'         // Axios error/response logger

import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { logger } from './utils/logger'

// ── Global uncaught JS errors ─────────────────────────────────────────────
window.onerror = (message, source, lineno, colno, error) => {
  logger.error('Global JS Error', error, {
    message: String(message),
    source,
    lineno,
    colno,
    page: window.location.pathname,
  });
  return false; // let browser default handler also run
};

// ── Global unhandled Promise rejections ───────────────────────────────────
window.onunhandledrejection = (event) => {
  logger.error('Unhandled Promise Rejection', event.reason, {
    page: window.location.pathname,
  });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
