/**
 * Purge Existing Avinode Trip Data
 *
 * This script removes all existing requests with avinode_trip_id
 * and their associated data (messages, quotes, proposals, etc.)
 *
 * Usage: node scripts/purge-existing-trips.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load env vars
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

async function purgeExistingTripData() {
  console.log('==============================================');
  console.log('   PURGE EXISTING AVINODE TRIP DATA');
  console.log('==============================================');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will delete data)'}`);
  console.log('');

  // Get all requests with avinode_trip_id
  const { data: existingRequests, error: fetchError } = await supabase
    .from('requests')
    .select('id, avinode_trip_id')
    .not('avinode_trip_id', 'is', null);

  if (fetchError) {
    console.error('Error fetching existing requests:', fetchError);
    return;
  }

  if (!existingRequests?.length) {
    console.log('No existing trip data to purge.');
    return;
  }

  console.log(`Found ${existingRequests.length} existing requests with trip IDs:`);

  // Group by trip ID for summary
  const tripCounts = {};
  existingRequests.forEach(r => {
    tripCounts[r.avinode_trip_id] = (tripCounts[r.avinode_trip_id] || 0) + 1;
  });

  Object.entries(tripCounts).forEach(([tripId, count]) => {
    console.log(`  - ${tripId}: ${count} request(s)`);
  });
  console.log('');

  if (DRY_RUN) {
    console.log('[DRY RUN] Would delete:');
    console.log(`  - ${existingRequests.length} requests`);
    console.log('  - All associated messages, quotes, proposals, webhook events, workflow states, agent executions');
    console.log('\nRun without --dry-run to actually delete.');
    return;
  }

  const requestIds = existingRequests.map(r => r.id);

  console.log('Deleting associated data...');

  // Delete in order due to foreign key constraints
  // 1. Delete messages
  const { count: msgCount } = await supabase
    .from('messages')
    .delete({ count: 'exact' })
    .in('request_id', requestIds);
  console.log(`  ✓ Deleted ${msgCount || 0} messages`);

  // 2. Delete proposals
  const { count: propCount } = await supabase
    .from('proposals')
    .delete({ count: 'exact' })
    .in('request_id', requestIds);
  console.log(`  ✓ Deleted ${propCount || 0} proposals`);

  // 3. Delete quotes
  const { count: quoteCount } = await supabase
    .from('quotes')
    .delete({ count: 'exact' })
    .in('request_id', requestIds);
  console.log(`  ✓ Deleted ${quoteCount || 0} quotes`);

  // 4. Delete webhook events
  const { count: webhookCount } = await supabase
    .from('avinode_webhook_events')
    .delete({ count: 'exact' })
    .in('request_id', requestIds);
  console.log(`  ✓ Deleted ${webhookCount || 0} webhook events`);

  // 5. Delete workflow states
  const { count: workflowCount } = await supabase
    .from('workflow_states')
    .delete({ count: 'exact' })
    .in('request_id', requestIds);
  console.log(`  ✓ Deleted ${workflowCount || 0} workflow states`);

  // 6. Delete agent executions
  const { count: execCount } = await supabase
    .from('agent_executions')
    .delete({ count: 'exact' })
    .in('request_id', requestIds);
  console.log(`  ✓ Deleted ${execCount || 0} agent executions`);

  // 7. Finally delete requests
  const { count: reqCount } = await supabase
    .from('requests')
    .delete({ count: 'exact' })
    .in('id', requestIds);
  console.log(`  ✓ Deleted ${reqCount || existingRequests.length} requests`);

  console.log('\n==============================================');
  console.log('   PURGE COMPLETE');
  console.log('==============================================');
  console.log(`Total requests removed: ${existingRequests.length}`);
  console.log(`Unique trip IDs removed: ${Object.keys(tripCounts).length}`);
}

purgeExistingTripData().catch(console.error);
