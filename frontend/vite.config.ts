import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from .env, .env.local etc.
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_URL || 'http://localhost:8000'

  return {
  plugins: [react()],
  server: {
    port: 3002,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: backendUrl.startsWith('https'),
      }
    }
  },
  build: {
    // Raise warning threshold slightly; main splitting is via manualChunks
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charts & data viz
          'vendor-charts': ['recharts'],
          // PDF generation (heavy)
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          // HTTP / query
          'vendor-http': ['axios', '@tanstack/react-query'],
          // Icons
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  }
}})
