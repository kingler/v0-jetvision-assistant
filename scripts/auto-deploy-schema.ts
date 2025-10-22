/**
 * Automated Database Schema Deployment to Supabase
 *
 * This script automatically applies all migrations to Supabase using the service role.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') })

async function deploySchema() {
  console.log('🚀 JetVision Database Schema Auto-Deployment\n')

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_URL not found')
    process.exit(1)
  }

  if (!serviceRoleKey) {
    console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found')
    process.exit(1)
  }

  console.log(`✅ Supabase URL: ${supabaseUrl}`)
  console.log(`✅ Service Role Key: ${serviceRoleKey.substring(0, 20)}...\n`)

  // Create admin client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  })

  // Read and execute migration files
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  const migrationFiles = [
    '001_initial_schema.sql',
    '002_rls_policies.sql',
    '003_seed_data.sql'
  ]

  for (const filename of migrationFiles) {
    const filePath = path.join(migrationsDir, filename)

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filename}`)
      continue
    }

    console.log(`📄 Applying migration: ${filename}`)
    const sql = fs.readFileSync(filePath, 'utf-8')

    try {
      // Execute SQL via Supabase REST API
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

      if (error) {
        // If exec_sql function doesn't exist, we need to use the SQL API directly
        // Try using the postgrest API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify({ sql_query: sql })
        })

        if (!response.ok) {
          // Fall back to manual instructions
          console.log(`   ⚠️  Automated execution not supported`)
          console.log(`   📋 Please execute manually via SQL Editor\n`)
          console.log(`File path: ${filePath}\n`)
          console.log(`SQL Editor: ${supabaseUrl.replace('.supabase.co', '')}/sql/new\n`)
          continue
        }
      }

      console.log(`   ✅ ${filename} applied successfully\n`)
    } catch (err) {
      console.error(`   ❌ Error applying ${filename}:`, err)
      console.log(`   📋 Please apply manually via SQL Editor\n`)
    }
  }

  // Verify tables were created
  console.log('🔍 Verifying schema deployment...\n')
  const tables = [
    'iso_agents',
    'client_profiles',
    'requests',
    'quotes',
    'workflow_states',
    'agent_executions'
  ]

  let allTablesExist = true
  for (const table of tables) {
    try {
      const { error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`   ❌ Table "${table}" - ${error.message}`)
        allTablesExist = false
      } else {
        console.log(`   ✅ Table "${table}" exists (${count ?? 0} rows)`)
      }
    } catch (err) {
      console.log(`   ❌ Table "${table}" - verification failed`)
      allTablesExist = false
    }
  }

  console.log()

  if (allTablesExist) {
    console.log('✅ Schema deployment complete!\n')
    console.log('Next steps:')
    console.log('  1. Verify RLS policies: Check Supabase Dashboard → Authentication → Policies')
    console.log('  2. Test connection: npm run test:supabase')
    console.log('  3. Run integration tests: npm run test:integration\n')
  } else {
    console.log('⚠️  Some tables are missing. Please check the deployment.\n')
    console.log('Manual deployment instructions:')
    console.log(`  1. Go to: ${supabaseUrl.replace('.supabase.co', '')}/sql/new`)
    console.log('  2. Copy and execute each migration file in order:')
    migrationFiles.forEach((file, i) => {
      console.log(`     ${i + 1}. ${file}`)
    })
    console.log()
  }
}

// Run deployment
deploySchema().catch((error) => {
  console.error('\n❌ Deployment failed:', error.message)
  process.exit(1)
})
