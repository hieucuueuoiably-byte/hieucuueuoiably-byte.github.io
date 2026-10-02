import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: true,
    host: '127.0.0.1',
    open: false
  },
  preview: {
    port: 5201,
    strictPort: true,
    host: '127.0.0.1'
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('home-character-paths.json')) return 'home-character-curves'
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
})
