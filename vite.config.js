import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const devApiTarget = process.env.VITE_DEV_API_TARGET || 'http://localhost:5162'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/images': {
        target: devApiTarget,
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: devApiTarget,
        changeOrigin: true,
        secure: false,
      },
      '/ordersHub': {
        target: devApiTarget,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
