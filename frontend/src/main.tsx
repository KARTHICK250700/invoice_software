import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './utils/httpsInterceptor' // NUCLEAR HTTPS ENFORCER - MUST BE FIRST
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
