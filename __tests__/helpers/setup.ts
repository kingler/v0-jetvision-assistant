/**
 * Test Setup File
 *
 * This file is run before all tests via vitest.config.ts
 * Sets up global test environment, mocks, and utilities
 */

import { vi } from 'vitest'

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
}

// Mock environment variables for testing
// @ts-ignore - NODE_ENV is read-only but we need to set it for tests
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock'
process.env.CLERK_SECRET_KEY = 'sk_test_mock'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'sk-test-openai-key'
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = '6379'

// Extend global types
declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>
  }
}

// Console suppression for cleaner test output (optional)
// Uncomment if you want to hide console logs during tests
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
// }
