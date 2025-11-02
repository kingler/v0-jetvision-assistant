import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    // Use jsdom for React component tests, node for others
    environment: 'jsdom',
    setupFiles: ['./__tests__/helpers/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', '.next', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/.next/**',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75,
      },
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@agents': path.resolve(__dirname, './agents'),
      '@lib': path.resolve(__dirname, './lib'),
      '@mcp-servers': path.resolve(__dirname, './mcp-servers'),
      '@components': path.resolve(__dirname, './components'),
      '@tests': path.resolve(__dirname, './__tests__'),
    },
  },
})
