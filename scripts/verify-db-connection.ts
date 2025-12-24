import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: '.env.local' })

/**
 * Validates required environment variables and exits with clear error if missing.
 * This ensures the script fails fast with actionable diagnostics rather than
 * producing unclear runtime errors later.
 */
function validateEnvVars(): { supabaseUrl: string; supabaseKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missingVars: string[] = []

  // Check each required variable and collect missing ones
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseKey || supabaseKey.trim() === '') {
    missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
  }

  // If any variables are missing, log error and exit
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`)
    })
    console.error('\nPlease ensure these variables are set in .env.local')
    process.exit(1)
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseKey: supabaseKey!
  }
}

// Validate environment variables before proceeding
const { supabaseUrl, supabaseKey } = validateEnvVars()

async function verifyDatabase() {
  console.log('=== Database Verification ===\n')
  console.log('URL:', supabaseUrl?.substring(0, 40) + '...')
  console.log('Key type:', supabaseKey?.substring(0, 20) + '...\n')

  // Create client with service role to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Test 1: Connection - use RPC to check database version
  console.log('1. Testing connection...')
  try {
    // Try a simple query on llm_config (which we just created)
    const { data, error } = await supabase
      .from('llm_config')
      .select('id')
      .limit(1)

    if (error) {
      console.log('   ❌ Query failed:', error.message, error.code)
      // Try conversation_state instead
      const { data: cs, error: csError } = await supabase
        .from('conversation_state')
        .select('id')
        .limit(1)
      if (csError) {
        console.log('   ❌ Backup query also failed:', csError.message)
      } else {
        console.log('   ✅ Connected (conversation_state works)')
      }
    } else {
      console.log('   ✅ Connected to Supabase')
    }
  } catch (e) {
    console.log('   ❌ Exception:', e)
  }
  console.log('')

  // Test 2: List core tables
  console.log('2. Checking core tables...')
  const coreTables = ['users', 'requests', 'proposals', 'quotes', 'clients', 'llm_config']
  for (const table of coreTables) {
    // Use proper existence check: select all columns with limit 1
    // This verifies table exists and is accessible, returning appropriate error metadata if not
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`)
    } else {
      console.log(`   ✅ ${table} exists`)
    }
  }
  console.log('')

  // Test 3: Write/Read test on conversation_state
  console.log('3. Testing write/read operations...')
  const testId = `test-${Date.now()}`

  // Insert
  const { error: insertError } = await supabase
    .from('conversation_state')
    .insert({
      thread_id: testId,
      user_id: 'test-user',
      current_step: 'route',
      data: { test: true }
    })

  if (insertError) {
    console.log('   ❌ Insert failed:', insertError.message)
  } else {
    console.log('   ✅ Insert successful')
  }

  // Read
  const { data, error: readError } = await supabase
    .from('conversation_state')
    .select('*')
    .eq('thread_id', testId)
    .single()

  if (readError) {
    // Log error if readError is truthy
    console.log('   ❌ Read failed:', readError.message)
  } else if (data == null) {
    // Handle case where .single() returns no row (data is null/undefined)
    console.log(`   ❌ No record found for testId: ${testId}`)
  } else {
    // Only access data.thread_id when data is confirmed to be non-null
    console.log('   ✅ Read successful:', data.thread_id)
  }

  // Cleanup
  const { error: deleteError } = await supabase
    .from('conversation_state')
    .delete()
    .eq('thread_id', testId)

  if (deleteError) {
    console.log('   ⚠️  Cleanup failed:', deleteError.message)
  } else {
    console.log('   ✅ Cleanup successful')
  }
  console.log('')

  // Test 4: LLM Config table
  console.log('4. Testing LLM config table...')
  const { data: llmConfig, error: llmError } = await supabase
    .from('llm_config')
    .select('id, provider, is_active, is_default')
    .limit(5)

  if (llmError) {
    console.log('   ❌ LLM config query failed:', llmError.message)
  } else {
    console.log(`   ✅ LLM config table accessible (${llmConfig?.length || 0} records)`)
  }

  console.log('\n=== Verification Complete ===')
}

verifyDatabase().catch(console.error)
