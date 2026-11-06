import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite dev proxy sidesteps the backend's missing CORS config during local dev.
// In production, add a CorsConfigurationSource bean to the Spring backend
// (or deploy the frontend behind the same origin).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
