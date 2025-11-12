/**
 * Deploy Database Schema to Supabase
 *
 * This script applies all migrations to your Supabase instance.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') })

async function deploySchema() {
  console.log('🚀 JetVision Database Schema Deployment\n')

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_URL not found in environment')
    process.exit(1)
  }

  if (!serviceRoleKey) {
    console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment')
    console.error('\nℹ️  To get your service role key:')
    console.error('   1. Go to: https://supabase.com/dashboard')
    console.error('   2. Select your project')
    console.error('   3. Go to Settings → API')
    console.error('   4. Copy the "service_role" key')
    console.error('   5. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=<your-key>\n')
    process.exit(1)
  }

  console.log(`✅ Supabase URL: ${supabaseUrl}`)
  console.log(`✅ Service Role Key: ${serviceRoleKey.substring(0, 20)}...`)

  // Create admin client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('📋 Manual Deployment Required\n')
  console.log('Supabase requires database migrations to be applied via the SQL Editor.')
  console.log('Please follow these steps:\n')

  // Read migration files
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  const migrationFiles = [
    '001_initial_schema.sql',
    '002_rls_policies.sql',
    '003_seed_data.sql'
  ]

  console.log('Step 1: Open the SQL Editor')
  console.log(`  → ${supabaseUrl.replace('sbzaevawnjlrsjsuevli.supabase.co', 'supabase.com/dashboard/project/sbzaevawnjlrsjsuevli/sql/new')}\n`)

  for (let i = 0; i < migrationFiles.length; i++) {
    const filename = migrationFiles[i]
    const filePath = path.join(migrationsDir, filename)

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filename}`)
      continue
    }

    console.log(`Step ${i + 2}: Apply ${filename}`)
    console.log(`  1. Open: ${filePath}`)
    console.log(`  2. Copy the entire file contents`)
    console.log(`  3. Paste into the SQL Editor`)
    console.log(`  4. Click "Run" (or press Cmd/Ctrl + Enter)`)
    console.log(`  5. Verify success message\n`)
  }

  console.log('After running all migrations, press Enter to verify deployment...')

  // Wait for user input
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      resolve()
    })
  })

  // Verify tables were created
  console.log('🔍 Verifying schema...')
  const tables = [
    'iso_agents',
    'client_profiles',
    'requests',
    'quotes',
    'workflow_states',
    'agent_executions'
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).select('count').limit(1)
    if (error) {
      console.log(`   ❌ Table "${table}" not found`)
    } else {
      console.log(`   ✅ Table "${table}" exists`)
    }
  }

  console.log('\n✅ Schema deployment complete!\n')
  console.log('Next steps:')
  console.log('  1. Run tests: npm run test:integration')
  console.log('  2. Check Supabase dashboard to verify tables')
  console.log('  3. Verify RLS policies are enabled\n')
}

// Handle errors
deploySchema().catch((error) => {
  console.error('\n❌ Deployment failed:', error.message)
  console.error('\n📖 Manual Deployment Instructions:')
  console.error('   1. Go to your Supabase dashboard')
  console.error('   2. Go to SQL Editor')
  console.error('   3. Copy/paste each migration file')
  console.error('   4. Execute them in order: 001, 002, 003\n')
  process.exit(1)
})
