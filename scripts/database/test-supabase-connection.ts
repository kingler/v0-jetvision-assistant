#!/usr/bin/env tsx

/**
 * Supabase Connection Test Script
 *
 * Tests connectivity to Supabase and verifies:
 * 1. Environment variables are set correctly
 * 2. Both clients can connect
 * 3. Database tables are accessible
 */

// Load environment variables BEFORE any imports
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env.local') });

async function testSupabaseConnection() {
  // Dynamic import after env vars are loaded
  const { supabase, supabaseAdmin } = await import('../../lib/supabase');
  console.log('\n🔍 Testing Supabase Connection...\n');

  // Test 1: Environment Variables
  console.log('1️⃣ Checking environment variables...');
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`   ✓ NEXT_PUBLIC_SUPABASE_URL: ${hasUrl ? '✅' : '❌'}`);
  console.log(`   ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${hasAnonKey ? '✅' : '❌'}`);
  console.log(`   ✓ SUPABASE_SERVICE_ROLE_KEY: ${hasServiceKey ? '✅' : '❌'}`);

  if (!hasUrl || !hasAnonKey || !hasServiceKey) {
    console.log('\n❌ Missing environment variables. Check your .env.local file.');
    process.exit(1);
  }

  // Test 2: Standard Client Connection
  console.log('\n2️⃣ Testing standard client connection...');
  try {
    const { data, error } = await supabase
      .from('iso_agents')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
      console.log(`   Error details:`, error);
    } else {
      console.log(`   ✅ Standard client connected successfully`);
    }
  } catch (err) {
    console.log(`   ❌ Connection error:`, err);
  }

  // Test 3: Admin Client Connection
  console.log('\n3️⃣ Testing admin client connection...');
  try {
    const { data, error } = await supabaseAdmin
      .from('iso_agents')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
      console.log(`   Error details:`, error);
    } else {
      console.log(`   ✅ Admin client connected successfully`);
    }
  } catch (err) {
    console.log(`   ❌ Connection error:`, err);
  }

  // Test 4: Table Accessibility
  console.log('\n4️⃣ Testing table accessibility...');
  const tables = [
    'iso_agents',
    'client_profiles',
    'requests',
    'quotes',
    'workflow_states',
    'agent_executions',
  ] as const;

  for (const table of tables) {
    try {
      const { error } = await supabaseAdmin
        .from(table)
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: accessible`);
      }
    } catch (err: any) {
      console.log(`   ❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n✅ Supabase connection test complete!\n');
  }

// Run the test
testSupabaseConnection().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
