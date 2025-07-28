import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { configDefaults } from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: true,
  },
  build: {
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, 'sidebar.html'),
      }
    },
    outDir: 'dist', // important for extension loading
  }
})