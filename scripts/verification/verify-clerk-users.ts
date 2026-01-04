#!/usr/bin/env tsx
/**
 * Verify Clerk User IDs in Supabase
 *
 * Runs the verification query from docs/fixes/USER_SYNC_REQUIRED.md
 * to check if Clerk user IDs exist in the iso_agents table.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

console.log('[DEBUG] Script initialized');

/**
 * Validate required environment variables
 * @returns Supabase URL and service role key
 */
function validateEnvVars(): { supabaseUrl: string; supabaseKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_URL not found in environment');
    console.error('\nℹ️  Please add NEXT_PUBLIC_SUPABASE_URL to .env.local\n');
    process.exit(1);
  }

  if (!supabaseKey) {
    console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment');
    console.error('\nℹ️  Please add SUPABASE_SERVICE_ROLE_KEY to .env.local\n');
    process.exit(1);
  }

  return {
    supabaseUrl,
    supabaseKey,
  };
}

/**
 * Verify a single Clerk user ID in the database
 * @param supabase - Supabase client with service role
 * @param clerkUserId - Clerk user ID to verify
 * @param email - Email address (for display purposes)
 * @returns User data if found, null otherwise
 */
async function verifyUser(
  supabase: any,
  clerkUserId: string,
  email: string
): Promise<{
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean | null;
} | null> {
  // Run verification query from docs/fixes/USER_SYNC_REQUIRED.md
  const { data, error } = await supabase
    .from('iso_agents')
    .select('clerk_user_id, email, full_name, role, is_active')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error) {
    // PGRST116 = no rows returned (user not found)
    if (error.code === 'PGRST116') {
      return null;
    }
    // Other database errors
    console.error(`   ❌ Database error for ${email}:`, error.message);
    return null;
  }

  return data;
}

/**
 * Main verification function
 */
async function verifyClerkUsers() {
  console.log('=== Clerk User Verification ===\n');
  
  // Validate environment variables
  console.log('Step 1: Validating environment variables...');
  const { supabaseUrl, supabaseKey } = validateEnvVars();
  console.log('Step 2: Environment variables validated');

  // Create Supabase client with service role to bypass RLS
  console.log('Step 3: Creating Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log('Step 4: Supabase client created');

  // Clerk user IDs to verify (from sync output)
  const usersToVerify = [
    {
      clerkUserId: 'user_34sZ1CKQIimet0xDqOVEFBeNxcz',
      email: 'ab@cucinalabs.com',
    },
    {
      clerkUserId: 'user_34sYCoSlyn6siCnXWL49nvakvYp',
      email: 'kinglerbercy@gmail.com',
    },
    {
      clerkUserId: 'user_34YmaZ12hM0a9wpp3aDqVBNuqyJ',
      email: 'kham@onekaleidoscope.com',
    },
    {
      clerkUserId: 'user_34Ylb9cbSnECXxeIsKcbwnZ4EUb',
      email: 'amb464@scarletmail.rutgers.edu',
    },
    {
      clerkUserId: 'user_34R2SvVkcfq5fWJkdQT0AFluLRr',
      email: 'designthrustudio@gmail.com',
    },
  ];

  console.log(`Verifying ${usersToVerify.length} Clerk user IDs...\n`);

  let foundCount = 0;
  let notFoundCount = 0;

  // Verify each user
  for (const { clerkUserId, email } of usersToVerify) {
    console.log(`Checking: ${email}`);
    console.log(`  Clerk User ID: ${clerkUserId}`);

    const userData = await verifyUser(supabase, clerkUserId, email);

    if (userData) {
      foundCount++;
      console.log('  ✅ User found in database:');
      console.log(`     - Email: ${userData.email}`);
      console.log(`     - Full Name: ${userData.full_name || '(not set)'}`);
      console.log(`     - Role: ${userData.role}`);
      console.log(`     - Active: ${userData.is_active !== null ? userData.is_active : '(not set)'}`);
    } else {
      notFoundCount++;
      console.log('  ❌ User NOT found in database');
      console.log('     → User needs to be synced via webhook or sync script');
    }
    console.log('');
  }

  // Summary
  console.log('=== Verification Summary ===');
  console.log(`✅ Found: ${foundCount} users`);
  console.log(`❌ Not Found: ${notFoundCount} users`);
  console.log(`📊 Total: ${usersToVerify.length} users\n`);

  if (notFoundCount > 0) {
    console.log('💡 To sync missing users, run:');
    console.log('   npm run clerk:sync-users\n');
  }

  console.log('=== Verification Complete ===');
}

// Run verification - match pattern from verify-db-connection.ts
verifyClerkUsers().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
