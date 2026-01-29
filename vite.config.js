/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',

      // 🔑 Mide todo el proyecto
      all: true,

      // 🛠️ CORRECCIÓN AQUÍ: Agregamos "**" para que entre a las carpetas
      include: ['src/**/*.{js,jsx,ts,tsx}'],

      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        'src/test/',
        'src/main.jsx',
        'src/supabase.js',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.spec.{js,jsx,ts,tsx}',
      ],

      // 🎯 Umbrales
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
})