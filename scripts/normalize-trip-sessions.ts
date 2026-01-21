#!/usr/bin/env tsx
/**
 * Normalize Trip Session States
 *
 * Updates all test trip sessions to match T68XYN's reference state,
 * ensuring consistent behavior when clicked in the sidebar.
 *
 * Usage: npx tsx scripts/normalize-trip-sessions.ts
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
  'T68XYN', // Reference session
  '2HD9UB',
  '5F463X',
  'VZ2UUC',
];

// The normalized state that all sessions should have
// This matches T68XYN's working state
const NORMALIZED_STATE = {
  status: 'awaiting_quotes', // Set to awaiting_quotes so RFQs are fetched on click
  session_status: 'active',
  current_step: 3, // Step 3 = requesting quotes phase
  workflow_state: {
    phase: 'requesting_quotes',
  },
};

async function normalizeSession(tripId: string): Promise<boolean> {
  const { data: session, error: fetchError } = await supabase
    .from('requests')
    .select('id, avinode_trip_id, status, session_status, current_step')
    .eq('avinode_trip_id', tripId)
    .single();

  if (fetchError || !session) {
    console.error(`❌ Failed to find session for ${tripId}:`, fetchError?.message);
    return false;
  }

  // Update session with normalized state
  const { error: updateError } = await supabase
    .from('requests')
    .update({
      status: NORMALIZED_STATE.status,
      session_status: NORMALIZED_STATE.session_status,
      current_step: NORMALIZED_STATE.current_step,
      workflow_state: NORMALIZED_STATE.workflow_state,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  if (updateError) {
    console.error(`❌ Failed to update session ${tripId}:`, updateError.message);
    return false;
  }

  const changes: string[] = [];
  if (session.status !== NORMALIZED_STATE.status) {
    changes.push(`status: ${session.status} → ${NORMALIZED_STATE.status}`);
  }
  if (session.current_step !== NORMALIZED_STATE.current_step) {
    changes.push(`current_step: ${session.current_step} → ${NORMALIZED_STATE.current_step}`);
  }

  if (changes.length > 0) {
    console.log(`✅ ${tripId}: Updated (${changes.join(', ')})`);
  } else {
    console.log(`✅ ${tripId}: Already normalized`);
  }

  return true;
}

async function main() {
  console.log('🔄 Normalizing trip session states...\n');
  console.log('Target state:');
  console.log('   status:', NORMALIZED_STATE.status);
  console.log('   session_status:', NORMALIZED_STATE.session_status);
  console.log('   current_step:', NORMALIZED_STATE.current_step);
  console.log('   workflow_state:', JSON.stringify(NORMALIZED_STATE.workflow_state));
  console.log('\n' + '='.repeat(80) + '\n');

  let successCount = 0;
  let failCount = 0;

  for (const tripId of TEST_TRIP_IDS) {
    const success = await normalizeSession(tripId);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${TEST_TRIP_IDS.length}`);

  if (failCount === 0) {
    console.log('\n🎉 All trip sessions normalized successfully!');
    console.log('   Clicking any trip ID will now:');
    console.log('   1. Show the chat interface in "requesting quotes" step');
    console.log('   2. Auto-fetch RFQ data from Avinode');
    console.log('   3. Display flights/quotes consistently');
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
