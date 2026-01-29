import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Esto le dice a Vitest qué archivos contar para el %
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/main.jsx', 
        'src/supabase.js',
        '**/*.d.ts',
        '**/*.test.{js,jsx}',
        'dist',
        '.eslintrc.cjs'
      ]
    }
  },
})