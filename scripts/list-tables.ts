/**
 * List all tables in Supabase database
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

async function listTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Query information_schema to get list of tables
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `
    })
    .select()

  if (error) {
    // Try alternative method - query pg_tables
    console.log('📋 Querying database tables via pg_catalog...\n')

    const { data: tables, error: err2 } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')

    if (err2) {
      console.error('❌ Error:', err2.message)

      // Try one more method - test table accessibility
      console.log('\n📋 Testing table accessibility...\n')

      const tablesToTest = [
        'iso_agents',
        'client_profiles',
        'requests',
        'quotes',
        'workflow_states',
        'agent_executions',
        'clients',
        'iso_flight_requests',
        'iso_quotes'
      ]

      for (const table of tablesToTest) {
        const { error: testError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (!testError) {
          console.log(`✅ ${table}`)
        } else if (testError.code === 'PGRST205') {
          console.log(`❌ ${table} - Not found`)
        } else {
          console.log(`⚠️  ${table} - ${testError.message}`)
        }
      }

      return
    }

    console.log('Tables in public schema:')
    tables?.forEach((t: any) => {
      console.log(`  - ${t.tablename}`)
    })
    return
  }

  console.log('Tables:', data)
}

listTables().catch(console.error)
