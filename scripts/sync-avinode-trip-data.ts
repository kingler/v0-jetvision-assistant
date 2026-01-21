#!/usr/bin/env tsx

/**
 * Sync Database with Avinode Trip Data
 *
 * Updates the requests table with correct flight details from Avinode API.
 *
 * Usage:
 *   pnpm tsx scripts/sync-avinode-trip-data.ts
 *   pnpm tsx scripts/sync-avinode-trip-data.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const AVINODE_API_KEY = process.env.AVINODE_API_KEY || '';
const AVINODE_API_TOKEN = process.env.AVINODE_API_TOKEN || '';
const AVINODE_BASE_URL = process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!AVINODE_API_KEY) {
  console.error('❌ Missing AVINODE_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const isDryRun = process.argv.includes('--dry-run');

// TripIDs to sync
const TRIP_IDS = [
  'URT74T', 'JXWTXS', 'Z7P7XV', 'JZLHJF', 'R3WVBX',
  'UEBTAE', 'R4QFRX', 'T68XYN', '2HD9UB', '5F463X', 'VZ2UUC'
];

interface FlightDetails {
  tripId: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  passengers: number;
  returnDate?: string;
  returnAirport?: string;
  isRoundTrip: boolean;
}

async function fetchAvinodeData(tripId: string): Promise<FlightDetails | null> {
  const headers = {
    'Authorization': `Bearer ${AVINODE_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Avinode-ApiToken': AVINODE_API_TOKEN,
    'X-Avinode-ApiVersion': 'v1.0',
    'X-Avinode-Product': 'Jetvision/1.0.0',
    'X-Avinode-SentTimestamp': new Date().toISOString(),
  };

  try {
    // Try GET /rfqs/{tripId} first
    const rfqUrl = `${AVINODE_BASE_URL}/rfqs/${tripId}?taildetails=true&typedetails=true&timestamps=true`;
    const rfqResponse = await fetch(rfqUrl, { method: 'GET', headers });

    if (rfqResponse.ok) {
      const rfqData = await rfqResponse.json();
      const rfqs = Array.isArray(rfqData?.data) ? rfqData.data : (rfqData?.data ? [rfqData.data] : []);

      if (rfqs.length > 0) {
        return extractFlightDetails(tripId, rfqs);
      }
    }

    // Fallback: Try GET /trips/{tripId}
    const tripUrl = `${AVINODE_BASE_URL}/trips/${tripId}`;
    const tripResponse = await fetch(tripUrl, { method: 'GET', headers });

    if (tripResponse.ok) {
      const tripData = await tripResponse.json();
      const rfqs = tripData?.data?.rfqs || tripData?.rfqs || [];
      const segments = tripData?.data?.segments || tripData?.segments || [];

      if (Array.isArray(rfqs) && rfqs.length > 0) {
        return extractFlightDetails(tripId, rfqs);
      }

      if (segments.length > 0) {
        return extractFromSegments(tripId, segments);
      }
    }

    return null;
  } catch (error) {
    console.error(`   ❌ Error fetching ${tripId}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

function extractFlightDetails(tripId: string, rfqs: any[]): FlightDetails | null {
  // Collect all unique segments across all RFQs
  const allSegments: Array<{
    departure: string;
    arrival: string;
    date: string;
    pax: number;
  }> = [];

  for (const rfq of rfqs) {
    const segments = rfq.segments || [];
    for (const segment of segments) {
      const startAirport = segment.startAirportDetails || segment.startAirport || {};
      const endAirport = segment.endAirportDetails || segment.endAirport || {};
      const dateTime = segment.dateTime || {};
      const departureDateTime = segment.departureDateTime || {};

      const dep = startAirport.icao;
      const arr = endAirport.icao;
      const date = dateTime.date ||
        departureDateTime.dateTimeLocal?.split('T')[0] ||
        departureDateTime.dateTimeUTC?.split('T')[0];
      const pax = segment.paxCount ? parseInt(segment.paxCount) : 2;

      if (dep && arr && date) {
        // Check if this exact segment already exists
        const exists = allSegments.some(s =>
          s.departure === dep && s.arrival === arr && s.date === date
        );
        if (!exists) {
          allSegments.push({ departure: dep, arrival: arr, date, pax });
        }
      }
    }
  }

  if (allSegments.length === 0) {
    return null;
  }

  // Sort by date
  allSegments.sort((a, b) => a.date.localeCompare(b.date));

  const firstSegment = allSegments[0];
  const isRoundTrip = allSegments.length > 1;

  // For round trips, find the return segment
  let returnDate: string | undefined;
  let returnAirport: string | undefined;

  if (isRoundTrip && allSegments.length >= 2) {
    const returnSegment = allSegments[1];
    returnDate = returnSegment.date;
    returnAirport = returnSegment.arrival;
  }

  return {
    tripId,
    departureAirport: firstSegment.departure,
    arrivalAirport: firstSegment.arrival,
    departureDate: firstSegment.date,
    passengers: firstSegment.pax,
    returnDate,
    returnAirport,
    isRoundTrip,
  };
}

function extractFromSegments(tripId: string, segments: any[]): FlightDetails | null {
  if (segments.length === 0) return null;

  const allSegments: Array<{
    departure: string;
    arrival: string;
    date: string;
    pax: number;
  }> = [];

  for (const segment of segments) {
    const startAirport = segment.startAirportDetails || segment.startAirport || {};
    const endAirport = segment.endAirportDetails || segment.endAirport || {};
    const dateTime = segment.dateTime || {};
    const departureDateTime = segment.departureDateTime || {};

    const dep = startAirport.icao;
    const arr = endAirport.icao;
    const date = dateTime.date ||
      departureDateTime.dateTimeLocal?.split('T')[0] ||
      departureDateTime.dateTimeUTC?.split('T')[0];
    const pax = segment.paxCount ? parseInt(segment.paxCount) : 2;

    if (dep && arr && date) {
      allSegments.push({ departure: dep, arrival: arr, date, pax });
    }
  }

  if (allSegments.length === 0) return null;

  allSegments.sort((a, b) => a.date.localeCompare(b.date));

  const firstSegment = allSegments[0];
  const isRoundTrip = allSegments.length > 1;

  let returnDate: string | undefined;
  let returnAirport: string | undefined;

  if (isRoundTrip && allSegments.length >= 2) {
    const returnSegment = allSegments[1];
    returnDate = returnSegment.date;
    returnAirport = returnSegment.arrival;
  }

  return {
    tripId,
    departureAirport: firstSegment.departure,
    arrivalAirport: firstSegment.arrival,
    departureDate: firstSegment.date,
    passengers: firstSegment.pax,
    returnDate,
    returnAirport,
    isRoundTrip,
  };
}

async function syncTripData(): Promise<void> {
  console.log('🔄 Syncing Database with Avinode Trip Data\n');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes will be made)' : '✏️  LIVE (database will be updated)'}`);
  console.log(`Base URL: ${AVINODE_BASE_URL}`);
  console.log(`\nProcessing ${TRIP_IDS.length} TripIDs...\n`);
  console.log('='.repeat(100));

  const updates: Array<{
    tripId: string;
    before: any;
    after: FlightDetails;
    changes: string[];
  }> = [];

  const errors: Array<{ tripId: string; error: string }> = [];

  for (const tripId of TRIP_IDS) {
    console.log(`\n📡 Processing ${tripId}...`);

    // Fetch current database records (may have duplicates)
    const { data: dbRecords, error: dbError } = await supabase
      .from('requests')
      .select('id, avinode_trip_id, departure_airport, arrival_airport, departure_date, return_date, passengers, trip_type')
      .eq('avinode_trip_id', tripId);

    if (dbError || !dbRecords || dbRecords.length === 0) {
      console.log(`   ⚠️  Not found in database, skipping`);
      errors.push({ tripId, error: 'Not found in database' });
      continue;
    }

    // Use the first record for comparison (they should all be the same)
    const dbRecord = dbRecords[0];
    const recordCount = dbRecords.length;
    if (recordCount > 1) {
      console.log(`   📋 Found ${recordCount} duplicate records`);
    }

    // Fetch Avinode data
    const avinodeData = await fetchAvinodeData(tripId);

    if (!avinodeData) {
      console.log(`   ⚠️  Could not fetch from Avinode API, skipping`);
      errors.push({ tripId, error: 'Could not fetch from Avinode API' });
      continue;
    }

    // Compare and identify changes
    const changes: string[] = [];
    const dbDepartureDate = dbRecord.departure_date?.split('T')[0];

    if (dbRecord.departure_airport !== avinodeData.departureAirport) {
      changes.push(`departure_airport: ${dbRecord.departure_airport} → ${avinodeData.departureAirport}`);
    }
    if (dbRecord.arrival_airport !== avinodeData.arrivalAirport) {
      changes.push(`arrival_airport: ${dbRecord.arrival_airport} → ${avinodeData.arrivalAirport}`);
    }
    if (dbDepartureDate !== avinodeData.departureDate) {
      changes.push(`departure_date: ${dbDepartureDate} → ${avinodeData.departureDate}`);
    }
    if (dbRecord.passengers !== avinodeData.passengers) {
      changes.push(`passengers: ${dbRecord.passengers} → ${avinodeData.passengers}`);
    }
    if (avinodeData.isRoundTrip) {
      const dbReturnDate = dbRecord.return_date?.split('T')[0];
      if (dbReturnDate !== avinodeData.returnDate) {
        changes.push(`return_date: ${dbReturnDate || 'null'} → ${avinodeData.returnDate}`);
      }
      if (dbRecord.trip_type !== 'round_trip') {
        changes.push(`trip_type: ${dbRecord.trip_type} → round_trip`);
      }
    }

    if (changes.length === 0) {
      console.log(`   ✅ No changes needed`);
      continue;
    }

    console.log(`   📝 Changes detected:`);
    changes.forEach(change => console.log(`      - ${change}`));

    updates.push({
      tripId,
      before: dbRecord,
      after: avinodeData,
      changes,
    });

    // Apply update if not dry run
    if (!isDryRun) {
      const updateData: Record<string, any> = {
        departure_airport: avinodeData.departureAirport,
        arrival_airport: avinodeData.arrivalAirport,
        departure_date: avinodeData.departureDate,
        passengers: avinodeData.passengers,
        updated_at: new Date().toISOString(),
      };

      if (avinodeData.isRoundTrip) {
        updateData.return_date = avinodeData.returnDate;
        updateData.trip_type = 'round_trip';
        updateData.segment_count = 2;
      }

      // Update ALL records with this avinode_trip_id (handles duplicates)
      const { error: updateError } = await supabase
        .from('requests')
        .update(updateData)
        .eq('avinode_trip_id', tripId);

      if (updateError) {
        console.log(`   ❌ Update failed: ${updateError.message}`);
        errors.push({ tripId, error: updateError.message });
      } else {
        console.log(`   ✅ Updated ${recordCount} record(s) successfully`);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  console.log('\n' + '='.repeat(100));
  console.log('\n📊 SYNC SUMMARY\n');

  if (updates.length === 0) {
    console.log('✅ All records are already in sync with Avinode API');
  } else {
    console.log(`📝 Records ${isDryRun ? 'that would be' : ''} updated: ${updates.length}`);
    console.log('\n| TripID  | Field           | Before          | After           |');
    console.log('|---------|-----------------|-----------------|-----------------|');

    for (const update of updates) {
      for (const change of update.changes) {
        const [field, values] = change.split(': ');
        const [before, after] = values.split(' → ');
        console.log(`| ${update.tripId.padEnd(7)} | ${field.padEnd(15)} | ${before.padEnd(15)} | ${after.padEnd(15)} |`);
      }
    }
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors: ${errors.length}`);
    errors.forEach(e => console.log(`   - ${e.tripId}: ${e.error}`));
  }

  console.log(`\n📈 Results:`);
  console.log(`   ✅ Updated: ${isDryRun ? '0 (dry run)' : updates.length}`);
  console.log(`   ⏭️  Skipped (no changes): ${TRIP_IDS.length - updates.length - errors.length}`);
  console.log(`   ⚠️  Errors: ${errors.length}`);

  if (isDryRun && updates.length > 0) {
    console.log(`\n💡 Run without --dry-run to apply these changes:`);
    console.log(`   pnpm tsx scripts/sync-avinode-trip-data.ts`);
  }
}

syncTripData()
  .then(() => {
    console.log('\n✅ Sync completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });
