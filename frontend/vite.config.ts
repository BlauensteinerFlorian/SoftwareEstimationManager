// Source: https://tailwindcss.com/docs/installation/using-vite + https://vitejs.dev/config/server-options.html#server-proxy
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Dev-Modus (außerhalb Docker): pnpm dev → Vite proxied /api an lokales Backend.
    // Pitfall #12: Frontend-Code nutzt IMMER relative /api/-URLs.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
