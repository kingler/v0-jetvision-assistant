#!/usr/bin/env tsx

/**
 * Check Database Trip Data
 *
 * Compares stored database values with Avinode API data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tripIds = [
  'URT74T', 'JXWTXS', 'Z7P7XV', 'JZLHJF', 'R3WVBX',
  'UEBTAE', 'R4QFRX', 'T68XYN', '2HD9UB', '5F463X', 'VZ2UUC'
];

async function checkDatabase() {
  console.log('📊 Checking Database for Trip Data\n');

  const { data, error } = await supabase
    .from('requests')
    .select('id, avinode_trip_id, departure_airport, arrival_airport, departure_date, passengers, trip_type')
    .in('avinode_trip_id', tripIds);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('| TripID  | DB Departure | DB Arrival | DB Date    | PAX | Trip Type |');
  console.log('|---------|--------------|------------|------------|-----|-----------|');

  for (const tripId of tripIds) {
    const row = data?.find(r => r.avinode_trip_id === tripId);
    if (row) {
      const dept = (row.departure_airport || 'N/A').padEnd(12);
      const arr = (row.arrival_airport || 'N/A').padEnd(10);
      const date = (row.departure_date || 'N/A').padEnd(10);
      const pax = String(row.passengers || 'N/A').padEnd(3);
      const tripType = (row.trip_type || 'N/A').padEnd(9);
      console.log(`| ${tripId.padEnd(7)} | ${dept} | ${arr} | ${date} | ${pax} | ${tripType} |`);
    } else {
      console.log(`| ${tripId.padEnd(7)} | NOT IN DB    | N/A        | N/A        | N/A | N/A       |`);
    }
  }

  const found = data?.filter(d => tripIds.includes(d.avinode_trip_id)).length || 0;
  console.log(`\n📈 Found ${found}/${tripIds.length} trips in database`);
}

checkDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
