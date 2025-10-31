import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow serving files from the project root so we can symlink
    // survey_metadata into src and have Vite resolve real paths.
    fs: {
      allow: ['..']
    }
  }
})
