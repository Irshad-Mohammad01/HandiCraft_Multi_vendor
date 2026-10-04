import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  esbuild: {
    drop: ['console', 'debugger']
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('/lucide-react/')) {
              return 'vendor-lucide';
            }
            if (
              normalizedId.includes('/react/') ||
              normalizedId.includes('/react-dom/') ||
              normalizedId.includes('/react-router/') ||
              normalizedId.includes('/react-router-dom/')
            ) {
              return 'vendor-react';
            }
            if (normalizedId.includes('/framer-motion/')) {
              return 'vendor-framer-motion';
            }
            if (normalizedId.includes('/axios/')) {
              return 'vendor-axios';
            }
            return 'vendor-libs';
          }
        }
      }
    }
  }
})

