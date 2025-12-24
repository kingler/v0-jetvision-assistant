/**
 * Script to set a user's role to admin
 *
 * Usage: npx tsx scripts/set-admin-role.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// User to make admin
const USER_CONFIG = {
  supabase_id: 'e26aacb7-da3b-4013-91f9-16e76472f82b',
  clerk_user_id: 'user_34sYCoSlyn6siCnXWL49nvakv',
  role: 'admin' as const,
};

async function setAdminRole() {
  console.log('Setting admin role for user...');
  console.log(`  Supabase ID: ${USER_CONFIG.supabase_id}`);
  console.log(`  Clerk ID: ${USER_CONFIG.clerk_user_id}`);

  // Try to update by Supabase ID first (iso_agents table)
  const { data: userById, error: errorById } = await supabase
    .from('iso_agents')
    .update({ role: USER_CONFIG.role })
    .eq('id', USER_CONFIG.supabase_id)
    .select()
    .single();

  if (userById) {
    console.log('\n✅ Successfully updated user role to admin (by Supabase ID)');
    console.log(`  User: ${userById.email || userById.full_name || userById.id}`);
    console.log(`  Role: ${userById.role}`);
    return;
  }

  // Try by Clerk user ID
  const { data: userByClerk, error: errorByClerk } = await supabase
    .from('iso_agents')
    .update({ role: USER_CONFIG.role })
    .eq('clerk_user_id', USER_CONFIG.clerk_user_id)
    .select()
    .single();

  if (userByClerk) {
    console.log('\n✅ Successfully updated user role to admin (by Clerk ID)');
    console.log(`  User: ${userByClerk.email || userByClerk.full_name || userByClerk.id}`);
    console.log(`  Role: ${userByClerk.role}`);
    return;
  }

  // If user doesn't exist, create them
  console.log('\nUser not found, creating new admin user...');

  const { data: newUser, error: createError } = await supabase
    .from('iso_agents')
    .insert({
      id: USER_CONFIG.supabase_id,
      clerk_user_id: USER_CONFIG.clerk_user_id,
      role: USER_CONFIG.role,
      full_name: 'Admin User',
      email: 'admin@jetvision.ai',
    })
    .select()
    .single();

  if (createError) {
    console.error('\n❌ Failed to create/update user:', createError.message);
    process.exit(1);
  }

  console.log('\n✅ Successfully created admin user');
  console.log(`  User ID: ${newUser.id}`);
  console.log(`  Role: ${newUser.role}`);
}

setAdminRole().catch(console.error);
