import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)))
} catch {
  // No .env yet; the default below still works.
}

// The browser only ever talks to this origin; /api is proxied to the API server.
// Keeps TMDB behind our own backend and sidesteps CORS entirely.
const proxy = {
  '/api': `http://localhost:${process.env.PORT ?? 4000}`,
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
})
