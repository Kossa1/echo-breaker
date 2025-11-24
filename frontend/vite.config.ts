import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const API_URL = "https://echo-breaker-backend.onrender.com"


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow serving files from the project root so we can symlink
    // survey_metadata into src and have Vite resolve real paths.
    fs: {
      allow: ['..']
    },
    // Proxy API requests and static images to Flask backend
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
      },
      '/survey_metadata': {
        target: API_URL,
        changeOrigin: true,
      }
    }
  }
})
