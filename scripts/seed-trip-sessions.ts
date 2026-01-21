#!/usr/bin/env tsx
/**
 * Seed Chat Sessions for Test Trip IDs
 *
 * This script creates chat sessions (requests) in the database for each
 * test trip ID, ensuring consistent behavior when trip IDs are clicked.
 *
 * Usage: npx tsx scripts/seed-trip-sessions.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test Trip IDs from testing-tripids.md
const TEST_TRIP_IDS = [
  'URT74T',
  'JXWTXS',
  'Z7P7XV',
  'JZLHJF',
  'R3WVBX',
  'UEBTAE',
  'R4QFRX',
  'T68XYN',
  '2HD9UB',
  '5F463X',
  'VZ2UUC',
];

async function getDefaultIsoAgentId(): Promise<string | null> {
  // Get the first ISO agent to use as the owner
  const { data, error } = await supabase
    .from('iso_agents')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    console.error('❌ Failed to get ISO agent:', error?.message);
    return null;
  }

  return data.id;
}

async function seedTripSession(tripId: string, isoAgentId: string): Promise<boolean> {
  // Check if a session already exists for this trip ID
  const { data: existing, error: checkError } = await supabase
    .from('requests')
    .select('id, avinode_trip_id')
    .eq('avinode_trip_id', tripId)
    .limit(1);

  if (checkError) {
    console.error(`❌ Error checking for existing session ${tripId}:`, checkError.message);
    return false;
  }

  if (existing && existing.length > 0) {
    console.log(`✅ Session already exists for ${tripId} (id: ${existing[0].id})`);
    return true;
  }

  // Create a new request/session for this trip ID
  const now = new Date().toISOString();

  const { data: created, error: createError } = await supabase
    .from('requests')
    .insert({
      iso_agent_id: isoAgentId,
      avinode_trip_id: tripId,
      status: 'pending', // Initial status
      session_status: 'active', // Active so it shows in sidebar
      conversation_type: 'flight_request',
      current_step: 3, // Step 3 = RFQ phase
      workflow_state: {
        phase: 'awaiting_quotes',
        tripId: tripId,
      },
      metadata: {
        source: 'seed-script',
        seeded_at: now,
      },
      created_at: now,
      updated_at: now,
      last_activity_at: now,
    })
    .select('id')
    .single();

  if (createError) {
    console.error(`❌ Failed to create session for ${tripId}:`, createError.message);
    return false;
  }

  console.log(`✅ Created session for ${tripId} (id: ${created.id})`);
  return true;
}

async function main() {
  console.log('🚀 Seeding chat sessions for test trip IDs...\n');

  // Get the ISO agent ID to use
  const isoAgentId = await getDefaultIsoAgentId();
  if (!isoAgentId) {
    console.error('❌ No ISO agent found. Please ensure you have an active ISO agent in the database.');
    process.exit(1);
  }

  console.log(`📌 Using ISO Agent ID: ${isoAgentId}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const tripId of TEST_TRIP_IDS) {
    const success = await seedTripSession(tripId, isoAgentId);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${TEST_TRIP_IDS.length}`);

  if (failCount === 0) {
    console.log('\n🎉 All trip sessions seeded successfully!');
    console.log('   You can now click on any trip ID in the sidebar and it will fetch RFQ data consistently.');
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
