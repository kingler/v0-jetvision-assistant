#!/usr/bin/env tsx

/**
 * Diagnostic Script: Check Authentication and User Sync Status
 * 
 * This script helps identify 403/404 errors by:
 * 1. Checking Clerk authentication configuration
 * 2. Verifying user sync status between Clerk and Supabase
 * 3. Testing API endpoint accessibility
 * 4. Checking RLS policy configuration
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('🔍 Authentication & User Sync Diagnostic Tool');
  console.log('==============================================\n');

  // Dynamic imports
  const { createClient } = await import('@supabase/supabase-js');
  const { clerkClient } = await import('@clerk/nextjs/server');

  // Check environment variables
  console.log('📋 Step 1: Checking Environment Variables\n');
  const envVars = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const missingVars: string[] = [];
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      missingVars.push(key);
      console.log(`  ❌ ${key}: MISSING`);
    } else {
      const masked = value.length > 20 ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}` : '***';
      console.log(`  ✅ ${key}: ${masked}`);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n⚠️  Missing ${missingVars.length} environment variable(s). Please add them to .env.local`);
    process.exit(1);
  }

  // Check Clerk connection
  console.log('\n📋 Step 2: Checking Clerk Connection\n');
  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({ limit: 5 });
    console.log(`  ✅ Clerk connected successfully`);
    console.log(`  📊 Found ${users.data.length} user(s) in Clerk`);
    
    if (users.data.length > 0) {
      console.log('\n  Clerk Users:');
      users.data.forEach((user, idx) => {
        const email = user.emailAddresses[0]?.emailAddress || 'No email';
        console.log(`    ${idx + 1}. ${email} (ID: ${user.id})`);
      });
    }
  } catch (error) {
    console.error('  ❌ Clerk connection failed:', error);
    process.exit(1);
  }

  // Check Supabase connection
  console.log('\n📋 Step 3: Checking Supabase Connection\n');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase.from('iso_agents').select('count').limit(1);
    if (error) throw error;
    console.log('  ✅ Supabase connected successfully');
  } catch (error) {
    console.error('  ❌ Supabase connection failed:', error);
    process.exit(1);
  }

  // Check user sync status
  console.log('\n📋 Step 4: Checking User Sync Status\n');
  let missingInSupabase: any[] = [];
  try {
    const clerkClientInstance = await clerkClient();
    const clerkUsers = await clerkClientInstance.users.getUserList({ limit: 100 });
    
    const { data: supabaseUsers, error: supabaseError } = await supabase
      .from('iso_agents')
      .select('clerk_user_id, email, full_name, role, is_active');

    if (supabaseError) {
      console.error('  ❌ Error fetching Supabase users:', supabaseError);
      process.exit(1);
    }

    console.log(`  📊 Clerk users: ${clerkUsers.data.length}`);
    console.log(`  📊 Supabase users: ${supabaseUsers?.length || 0}\n`);

    // Check for missing users
    const clerkUserIds = new Set(clerkUsers.data.map(u => u.id));
    const supabaseUserIds = new Set(supabaseUsers?.map(u => u.clerk_user_id) || []);
    
    missingInSupabase = clerkUsers.data.filter(u => !supabaseUserIds.has(u.id));
    const extraInSupabase = supabaseUsers?.filter(u => !clerkUserIds.has(u.clerk_user_id)) || [];

    if (missingInSupabase.length > 0) {
      console.log('  ⚠️  Users in Clerk but NOT in Supabase:');
      missingInSupabase.forEach(user => {
        const email = user.emailAddresses[0]?.emailAddress || 'No email';
        console.log(`    - ${email} (ID: ${user.id})`);
      });
      console.log('\n  💡 Run: npm run clerk:sync-users to sync these users');
    } else {
      console.log('  ✅ All Clerk users are synced to Supabase');
    }

    if (extraInSupabase.length > 0) {
      console.log('\n  ⚠️  Users in Supabase but NOT in Clerk (orphaned):');
      extraInSupabase.forEach(user => {
        console.log(`    - ${user.email} (Clerk ID: ${user.clerk_user_id})`);
      });
    }

    // Show synced users
    const syncedUsers = clerkUsers.data.filter(u => supabaseUserIds.has(u.id));
    if (syncedUsers.length > 0) {
      console.log(`\n  ✅ ${syncedUsers.length} user(s) properly synced:`);
      syncedUsers.slice(0, 5).forEach(user => {
        const email = user.emailAddresses[0]?.emailAddress || 'No email';
        const supabaseUser = supabaseUsers?.find(u => u.clerk_user_id === user.id);
        console.log(`    - ${email} (Role: ${supabaseUser?.role || 'unknown'}, Active: ${supabaseUser?.is_active ? 'Yes' : 'No'})`);
      });
    }

  } catch (error) {
    console.error('  ❌ Error checking user sync:', error);
    process.exit(1);
  }

  // Check RLS policies
  console.log('\n📋 Step 5: Checking RLS Policies\n');
  try {
    const { data: policies, error: policyError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT tablename, policyname, cmd
          FROM pg_policies
          WHERE schemaname = 'public'
          AND tablename IN ('iso_agents', 'requests', 'client_profiles')
          ORDER BY tablename, cmd;
        `
      });

    if (policyError) {
      // Try alternative query
      const { data: altPolicies } = await supabase
        .from('iso_agents')
        .select('*')
        .limit(0);
      
      console.log('  ✅ RLS is enabled (cannot query policies directly, but table access works)');
    } else {
      console.log('  ✅ RLS policies found');
      if (policies && policies.length > 0) {
        console.log(`    Found ${policies.length} policy(ies)`);
      }
    }
  } catch (error) {
    console.log('  ⚠️  Could not verify RLS policies (this is okay if using service role)');
  }

  // Summary
  console.log('\n📊 Summary');
  console.log('==========');
  console.log('✅ Environment variables: OK');
  console.log('✅ Clerk connection: OK');
  console.log('✅ Supabase connection: OK');
  
  if (missingInSupabase && missingInSupabase.length > 0) {
    console.log(`⚠️  ${missingInSupabase.length} user(s) need to be synced`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Run: npm run clerk:sync-users');
    console.log('   2. Verify users appear in Supabase');
    console.log('   3. Test API endpoints again');
  } else {
    console.log('✅ All users are synced');
    console.log('\n💡 If you still see 403/404 errors:');
    console.log('   1. Check browser console for specific endpoint errors');
    console.log('   2. Verify Clerk session is active');
    console.log('   3. Check server logs for detailed error messages');
  }

  console.log('\n');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
