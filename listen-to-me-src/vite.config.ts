import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    host: '127.0.0.1',
    open: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3042',
        changeOrigin: true,
      },
    },
  },
})
