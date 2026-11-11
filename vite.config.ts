import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the build works at any URL, including the
  // GitHub Pages sub-path https://<user>.github.io/digital-reversi/
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Full-game UI tests take ~2 s normally and ~5 s under coverage, which hit
    // the 5 s default and failed intermittently. Give them comfortable headroom.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/game/testUtils.ts',
        'src/main.tsx',
      ],
      // CI fails if coverage drops below these levels
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
})
