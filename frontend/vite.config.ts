import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
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
})
