#!/usr/bin/env tsx
/**
 * Check Trip Session States
 *
 * Examines the current state of all test trip sessions to identify inconsistencies.
 *
 * Usage: npx tsx scripts/check-trip-sessions.ts
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

async function main() {
  console.log('🔍 Checking trip session states...\n');

  const { data: sessions, error } = await supabase
    .from('requests')
    .select(`
      id,
      avinode_trip_id,
      status,
      session_status,
      current_step,
      workflow_state,
      departure_airport,
      arrival_airport,
      departure_date,
      passengers,
      quotes_received,
      quotes_expected,
      avinode_deep_link,
      created_at,
      last_activity_at
    `)
    .in('avinode_trip_id', TEST_TRIP_IDS)
    .order('avinode_trip_id');

  if (error) {
    console.error('❌ Failed to fetch sessions:', error.message);
    process.exit(1);
  }

  console.log(`Found ${sessions?.length || 0} sessions\n`);
  console.log('=' .repeat(100));

  // Reference session (T68XYN)
  const referenceSession = sessions?.find(s => s.avinode_trip_id === 'T68XYN');

  if (referenceSession) {
    console.log('\n📌 REFERENCE SESSION (T68XYN):');
    console.log('   status:', referenceSession.status);
    console.log('   session_status:', referenceSession.session_status);
    console.log('   current_step:', referenceSession.current_step);
    console.log('   departure_airport:', referenceSession.departure_airport);
    console.log('   arrival_airport:', referenceSession.arrival_airport);
    console.log('   departure_date:', referenceSession.departure_date);
    console.log('   passengers:', referenceSession.passengers);
    console.log('   quotes_received:', referenceSession.quotes_received);
    console.log('   has_deep_link:', !!referenceSession.avinode_deep_link);
    console.log('   workflow_state:', JSON.stringify(referenceSession.workflow_state));
    console.log('=' .repeat(100));
  }

  console.log('\n📋 ALL SESSIONS COMPARISON:\n');

  for (const tripId of TEST_TRIP_IDS) {
    const session = sessions?.find(s => s.avinode_trip_id === tripId);

    if (!session) {
      console.log(`❌ ${tripId}: NOT FOUND`);
      continue;
    }

    const isReference = tripId === 'T68XYN';
    const prefix = isReference ? '🎯' : '  ';

    // Check for differences from reference
    const differences: string[] = [];
    if (referenceSession) {
      if (session.status !== referenceSession.status) {
        differences.push(`status: ${session.status} (ref: ${referenceSession.status})`);
      }
      if (session.session_status !== referenceSession.session_status) {
        differences.push(`session_status: ${session.session_status} (ref: ${referenceSession.session_status})`);
      }
      if (session.current_step !== referenceSession.current_step) {
        differences.push(`current_step: ${session.current_step} (ref: ${referenceSession.current_step})`);
      }
    }

    const route = session.departure_airport && session.arrival_airport
      ? `${session.departure_airport} → ${session.arrival_airport}`
      : 'No route';

    console.log(`${prefix} ${tripId}:`);
    console.log(`      id: ${session.id}`);
    console.log(`      route: ${route}`);
    console.log(`      status: ${session.status}`);
    console.log(`      session_status: ${session.session_status}`);
    console.log(`      current_step: ${session.current_step}`);
    console.log(`      quotes: ${session.quotes_received || 0}/${session.quotes_expected || 0}`);
    console.log(`      has_deep_link: ${!!session.avinode_deep_link}`);

    if (differences.length > 0 && !isReference) {
      console.log(`      ⚠️  DIFFERENCES: ${differences.join(', ')}`);
    }
    console.log('');
  }

  console.log('=' .repeat(100));
  console.log('\n✅ Check complete');
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
