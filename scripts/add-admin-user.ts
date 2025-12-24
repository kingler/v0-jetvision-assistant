/**
 * Add Admin User Script
 * 
 * Adds a user as admin in the database.
 * Usage: tsx scripts/add-admin-user.ts <email>
 * 
 * @example
 * tsx scripts/add-admin-user.ts kinglerbercy@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

// Load environment variables from project root
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function addAdminUser(email: string) {
  console.log(`\n🚀 Adding admin user: ${email}\n`);

  try {
    // 1. Check if Supabase credentials are configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing Supabase credentials. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local'
      );
    }

    // 2. Check if Clerk credentials are configured
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.warn(
        '⚠️  WARNING: CLERK_SECRET_KEY not found. Will attempt to find user by email in Supabase only.'
      );
    }

    // 3. Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Find user in Supabase by email
    console.log('📧 Looking up user in database...');
    const { data: existingUser, error: lookupError } = await supabase
      .from('iso_agents')
      .select('*')
      .eq('email', email)
      .single();

    if (lookupError && lookupError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is okay
      throw new Error(`Database lookup failed: ${lookupError.message}`);
    }

    if (existingUser) {
      // User exists, update role to admin
      console.log(`✅ User found: ${existingUser.full_name || email}`);
      console.log(`   Current role: ${existingUser.role}`);

      if (existingUser.role === 'admin') {
        console.log('ℹ️  User is already an admin. No changes needed.');
        return;
      }

      console.log('🔄 Updating role to admin...');
      const { error: updateError } = await supabase
        .from('iso_agents')
        .update({ role: 'admin' })
        .eq('id', existingUser.id);

      if (updateError) {
        throw new Error(`Failed to update user role: ${updateError.message}`);
      }

      console.log('✅ Successfully updated user to admin role!');
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Clerk User ID: ${existingUser.clerk_user_id}`);
      console.log(`   Email: ${existingUser.email}`);
      return;
    }

    // 5. User doesn't exist in Supabase, try to find in Clerk
    if (!clerkSecretKey) {
      throw new Error(
        `User not found in database and CLERK_SECRET_KEY not configured. ` +
        `Please ensure the user has signed up at least once, or provide CLERK_SECRET_KEY to auto-create.`
      );
    }

    console.log('🔍 User not found in database. Looking up in Clerk...');
    
    // Note: clerkClient is not available in server context like this
    // We'll need to create the user entry manually with just the email
    console.log('⚠️  Cannot access Clerk API from script context.');
    console.log('   Creating user entry with email only...');
    console.log('   User must sign up/login at least once for Clerk ID to be populated.');

    // 6. Create user entry with temporary clerk_user_id
    // Since clerk_user_id is NOT NULL with UNIQUE constraint, we use a UUID v4
    // with 'temp_' prefix to ensure uniqueness and avoid collisions
    // The webhook will update this when the user signs up by matching on email
    const tempClerkUserId = `temp_${randomUUID()}`;
    const { data: newUser, error: createError } = await supabase
      .from('iso_agents')
      .insert({
        email: email,
        full_name: email.split('@')[0], // Use email prefix as name
        role: 'admin',
        clerk_user_id: tempClerkUserId, // Temporary UUID-based ID, will be updated by webhook via email match
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    console.log('✅ Successfully created admin user entry!');
    console.log(`   User ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Temporary Clerk User ID: ${tempClerkUserId}`);
    console.log('\n⚠️  IMPORTANT: User must sign up/login at least once for Clerk ID to be populated.');
    console.log('   The Clerk webhook should update the clerk_user_id by matching on email.');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Main execution
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email address is required');
  console.log('\nUsage: tsx scripts/add-admin-user.ts <email>');
  console.log('Example: tsx scripts/add-admin-user.ts kinglerbercy@gmail.com\n');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Error: Invalid email format');
  process.exit(1);
}

addAdminUser(email)
  .then(() => {
    console.log('\n✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

