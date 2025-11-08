/**
 * Test Setup File
 *
 * This file is run before all tests via vitest.config.ts
 * Sets up global test environment, mocks, and utilities
 */

import { vi } from 'vitest'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables from .env.local for testing
config({ path: path.join(process.cwd(), '.env.local') })

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
}

// Mock environment variables for testing (fallback if .env.local doesn't exist)
// @ts-ignore - NODE_ENV is read-only but we need to set it for tests
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test'
if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock'
if (!process.env.CLERK_SECRET_KEY) process.env.CLERK_SECRET_KEY = 'sk_test_mock'
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
if (!process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = 'sk-test-openai-key'
if (!process.env.REDIS_HOST) process.env.REDIS_HOST = 'localhost'
if (!process.env.REDIS_PORT) process.env.REDIS_PORT = '6379'

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Warning: Missing environment variables for tests:')
  missingEnvVars.forEach((varName) => {
    console.warn(`   - ${varName}`)
  })
  console.warn('\nℹ️  Using mock values for tests.\n')
}

// Set test timeout (10 seconds default)
if (typeof (global as any).vi !== 'undefined') {
  (global as any).vi?.setConfig?.({ testTimeout: 10000 })
}

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

// Console output for test runs
console.log('🧪 Vitest setup complete\n')
