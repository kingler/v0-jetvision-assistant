#!/usr/bin/env tsx

/**
 * Sync Existing Clerk Users to Supabase
 *
 * This script fetches all users from Clerk and creates corresponding records
 * in the Supabase iso_agents table. Useful for:
 * - Initial setup when webhook wasn't configured
 * - Recovering from sync failures
 * - Migrating from another system
 *
 * Usage:
 *   tsx scripts/clerk/sync-users.ts [--dry-run]
 *
 * Options:
 *   --dry-run   Show what would be synced without actually syncing
 */

// Load environment variables FIRST - before any other code runs
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' });

// Use dynamic imports to ensure env vars are loaded before Clerk SDK initializes
import type { SupabaseClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');

// Valid roles (must match database enum: user_role = 'iso_agent' | 'admin' | 'operator')
const VALID_ROLES = ['iso_agent', 'admin', 'operator'] as const;
type UserRole = (typeof VALID_ROLES)[number];

interface SyncStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

// Main async wrapper to use dynamic imports
async function main() {
  // Dynamic imports - these run AFTER dotenv has loaded env vars
  const { createClient } = await import('@supabase/supabase-js');
  const { clerkClient } = await import('@clerk/nextjs/server');

  // Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Required:');
    console.log('  - NEXT_PUBLIC_SUPABASE_URL');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

  // Sync function - defined inside main() to access supabase and clerkClient
  async function syncUsers() {
    console.log('🔄 Clerk → Supabase User Sync');
    console.log('==============================\n');

    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    const stats: SyncStats = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      // Fetch all users from Clerk
      console.log('📥 Fetching users from Clerk...');

      const client = await clerkClient();
      const clerkUsersResponse = await client.users.getUserList({
        limit: 100, // Adjust if you have more users
      });

      const clerkUsers = clerkUsersResponse.data;
      stats.total = clerkUsers.length;

      console.log(`Found ${stats.total} users in Clerk\n`);

      if (stats.total === 0) {
        console.log('⚠️  No users found in Clerk');
        return;
      }

      // Process each user
      for (const user of clerkUsers) {
        const primaryEmail = user.emailAddresses.find(
          (e) => e.id === user.primaryEmailAddressId
        );

        if (!primaryEmail) {
          console.log(`⚠️  Skipping user ${user.id}: No email address`);
          stats.skipped++;
          continue;
        }

        const email = primaryEmail.emailAddress;
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email;

        // Get role from public metadata or default to iso_agent
        const metadata = user.publicMetadata as Record<string, unknown>;
        const proposedRole = metadata?.role;

        let role: UserRole = 'iso_agent';
        if (typeof proposedRole === 'string' && VALID_ROLES.includes(proposedRole as UserRole)) {
          role = proposedRole as UserRole;
        }

        console.log(`Processing: ${email}`);
        console.log(`  Clerk ID: ${user.id}`);
        console.log(`  Name: ${fullName}`);
        console.log(`  Role: ${role}`);

        if (DRY_RUN) {
          console.log(`  [DRY RUN] Would sync to iso_agents table`);
          stats.created++;
          continue;
        }

        try {
          // Check if user already exists
          const { data: existingUser } = await supabase
            .from('iso_agents')
            .select('id, email')
            .eq('clerk_user_id', user.id)
            .single();

          if (existingUser) {
            // User exists, update if needed
            console.log(`  ℹ️  User exists in Supabase, updating...`);

            const { error: updateError } = await supabase
              .from('iso_agents')
              .update({
                email,
                full_name: fullName,
                role,
                is_active: true,
                updated_at: new Date().toISOString(),
              })
              .eq('clerk_user_id', user.id);

            if (updateError) {
              console.error(`  ❌ Error updating user:`, updateError.message);
              stats.errors++;
            } else {
              console.log(`  ✅ Updated`);
              stats.updated++;
            }
          } else {
            // User doesn't exist, create
            console.log(`  ➕ Creating in Supabase...`);

            const { error: insertError } = await supabase.from('iso_agents').insert({
              clerk_user_id: user.id,
              email,
              full_name: fullName,
              role,
              is_active: true,
            });

            if (insertError) {
              console.error(`  ❌ Error creating user:`, insertError.message);
              stats.errors++;
            } else {
              console.log(`  ✅ Created`);
              stats.created++;
            }
          }
        } catch (error) {
          console.error(`  ❌ Error processing user:`, error);
          stats.errors++;
        }

        console.log();
      }

      // Print summary
      console.log('\n📊 Sync Summary');
      console.log('================');
      console.log(`Total users:     ${stats.total}`);
      console.log(`Created:         ${stats.created}`);
      console.log(`Updated:         ${stats.updated}`);
      console.log(`Skipped:         ${stats.skipped}`);
      console.log(`Errors:          ${stats.errors}`);
      console.log();

      if (stats.errors > 0) {
        console.log('⚠️  Some users failed to sync. Check the errors above.');
      } else if (DRY_RUN) {
        console.log('✅ Dry run completed successfully!');
        console.log('Run without --dry-run to actually sync the users.');
      } else {
        console.log('✅ Sync completed successfully!');
        console.log();
        console.log('Verify in Supabase:');
        console.log('  SELECT * FROM iso_agents ORDER BY created_at DESC;');
      }
    } catch (error) {
      console.error('❌ Fatal error during sync:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      process.exit(1);
    }
  }

  // Run the sync
  await syncUsers();
}

// Execute main
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
