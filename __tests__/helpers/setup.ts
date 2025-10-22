/**
 * Vitest Global Setup
 *
 * This file is executed before all tests run.
 * Use it for global test configuration and setup.
 */

import { config } from 'dotenv'
import path from 'path'

// Load environment variables from .env.local for testing
config({ path: path.join(process.cwd(), '.env.local') })

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
  console.warn('\nℹ️  Tests may fail without proper environment configuration.')
  console.warn('   Please ensure .env.local is configured correctly.\n')
}

// Set test timeout (10 seconds default)
if (typeof global.vi !== 'undefined') {
  global.vi?.setConfig?.({ testTimeout: 10000 })
}

// Console output for test runs
console.log('🧪 Vitest setup complete\n')
