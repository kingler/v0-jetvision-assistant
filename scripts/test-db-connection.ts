#!/usr/bin/env tsx

/**
 * Database Connection Test Script
 *
 * Tests connectivity to all Supabase database tables.
 * Run after deploying schema to verify successful deployment.
 *
 * Usage:
 *   npx tsx scripts/test-db-connection.ts
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../lib/types/database'

interface TestResult {
  table: string
  status: 'pass' | 'fail'
  message: string
}

async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase database connection...\n')

  // Verify environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
    process.exit(1)
  }

  if (!supabaseKey) {
    console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable')
    process.exit(1)
  }

  console.log('✅ Environment variables configured\n')

  // Create Supabase client with service role key
  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  // Tables to test
  const tables = [
    'users',
    'clients',
    'flight_requests',
    'quotes',
    'proposals',
    'communications',
    'workflow_history'
  ] as const

  const results: TestResult[] = []

  // Test each table
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(0)

      if (error) {
        results.push({
          table,
          status: 'fail',
          message: error.message
        })
      } else {
        results.push({
          table,
          status: 'pass',
          message: 'Table accessible'
        })
      }
    } catch (err) {
      results.push({
        table,
        status: 'fail',
        message: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }

  // Display results
  console.log('📊 Test Results:\n')
  console.log('─'.repeat(60))

  let passCount = 0
  let failCount = 0

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : '❌'
    const statusText = result.status === 'pass' ? 'PASS' : 'FAIL'

    console.log(`${icon} ${result.table.padEnd(20)} ${statusText.padEnd(6)} ${result.message}`)

    if (result.status === 'pass') {
      passCount++
    } else {
      failCount++
    }
  }

  console.log('─'.repeat(60))
  console.log(`\n📈 Summary: ${passCount}/${tables.length} tables accessible`)

  if (failCount > 0) {
    console.log('\n⚠️  Some tables failed accessibility check.')
    console.log('💡 Possible issues:')
    console.log('   - Schema not deployed yet (run deployment script first)')
    console.log('   - Incorrect environment variables')
    console.log('   - Network connectivity issues')
    console.log('   - Supabase service unavailable')
    console.log('\n📖 See docs/DATABASE_DEPLOYMENT.md for troubleshooting')
    process.exit(1)
  }

  console.log('\n🎉 All tables accessible! Database deployment successful.')
  console.log('\n📋 Next steps:')
  console.log('   1. Run integration tests: npm run test:integration -- database')
  console.log('   2. Verify RLS policies in Supabase dashboard')
  console.log('   3. Regenerate types: npx supabase gen types typescript --project-id <id> > lib/types/database.ts')

  process.exit(0)
}

// Run the test
testDatabaseConnection().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
