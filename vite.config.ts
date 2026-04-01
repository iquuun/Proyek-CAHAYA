import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Izinkan akses dari HP dan PC lain di jaringan lokal
    host: true,
    port: 5173,
    // Izinkan semua origin dari LAN
    allowedHosts: 'all',
  },
  // File types to support raw imports
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
