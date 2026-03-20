import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // permite acceso desde celular en la misma red
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5162', // ← siempre localhost (mismo PC que Vite)
        changeOrigin: true,
        secure: false,
      },
      '/ordersHub': {
        target: 'http://localhost:5162', // ← siempre localhost
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  }
});