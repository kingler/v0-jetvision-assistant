#!/usr/bin/env tsx
/**
 * Test the get_rfq tool invocation flow
 * Simulates what happens when frontend sends "get_rfq TRIPID"
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { AvinodeClient } from '../lib/mcp/clients/avinode-client';

async function testGetRFQFlow(tripId: string) {
  console.log(`\n🔍 Testing getRFQFlights flow for: ${tripId}\n`);

  const client = new AvinodeClient({
    apiKey: process.env.AVINODE_API_KEY || '',
    baseUrl: process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api',
  });

  try {
    console.log('📡 Calling getRFQFlights...');
    const result = await client.getRFQFlights(tripId);

    console.log('\n✅ Result:');
    console.log('  - Trip ID:', result.trip_id);
    console.log('  - Status:', result.status);
    console.log('  - Total RFQs:', result.total_rfqs);
    console.log('  - Total Quotes:', result.total_quotes);
    console.log('  - Flights Received:', result.flights_received);
    console.log('  - Departure:', result.departure_airport?.icao);
    console.log('  - Arrival:', result.arrival_airport?.icao);
    console.log('  - Date:', result.departure_date);

    if (result.flights && result.flights.length > 0) {
      console.log('\n📦 First 3 Flights:');
      result.flights.slice(0, 3).forEach((f, i) => {
        console.log(`  ${i+1}. ${f.operatorName} - ${f.aircraftType}`);
        console.log(`     Price: ${f.currency} ${f.totalPrice}`);
        console.log(`     Status: ${f.rfqStatus}`);
        console.log(`     Route: ${f.departureAirport?.icao} → ${f.arrivalAirport?.icao}`);
      });
    } else {
      console.log('\n⚠️  No flights in result');
    }

    return result;
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

const tripId = process.argv[2] || 'URT74T';
testGetRFQFlow(tripId)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
