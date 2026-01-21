#!/usr/bin/env tsx

/**
 * Verify Flight Details for TripIDs
 *
 * Checks the airports and dates for each TripID to verify
 * they are correctly displayed in the Flight Request Cards.
 *
 * Usage:
 *   pnpm tsx scripts/verify-tripid-flight-details.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const AVINODE_API_KEY = process.env.AVINODE_API_KEY || '';
const AVINODE_API_TOKEN = process.env.AVINODE_API_TOKEN || '';
const AVINODE_BASE_URL = process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

// TripIDs from testing-tripids.md
const TRIP_IDS = [
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

interface FlightDetails {
  tripId: string;
  status: 'success' | 'error';
  error?: string;
  segments: Array<{
    departureAirport: string;
    departureAirportName?: string;
    arrivalAirport: string;
    arrivalAirportName?: string;
    departureDate: string;
    departureTime?: string;
    passengers?: number;
  }>;
  rawData?: any;
}

async function fetchTripDetails(tripId: string): Promise<FlightDetails> {
  const headers = {
    'Authorization': `Bearer ${AVINODE_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Avinode-ApiToken': AVINODE_API_TOKEN,
    'X-Avinode-ApiVersion': 'v1.0',
    'X-Avinode-Product': 'Jetvision/1.0.0',
    'X-Avinode-SentTimestamp': new Date().toISOString(),
  };

  // Try GET /rfqs/{tripId} first (primary pattern per avinode-client.ts)
  try {
    const rfqUrl = `${AVINODE_BASE_URL}/rfqs/${tripId}?taildetails=true&typedetails=true&timestamps=true`;
    const rfqResponse = await fetch(rfqUrl, { method: 'GET', headers });

    if (rfqResponse.ok) {
      const rfqData = await rfqResponse.json();
      const rfqs = Array.isArray(rfqData?.data) ? rfqData.data : (rfqData?.data ? [rfqData.data] : []);

      if (rfqs.length > 0) {
        return extractFlightDetails(tripId, rfqs, rfqData);
      }
    }
  } catch (error) {
    // Fall through to /trips endpoint
  }

  // Fallback: Try GET /trips/{tripId}
  try {
    const tripUrl = `${AVINODE_BASE_URL}/trips/${tripId}`;
    const tripResponse = await fetch(tripUrl, { method: 'GET', headers });

    if (tripResponse.ok) {
      const tripData = await tripResponse.json();
      const rfqs = tripData?.data?.rfqs || tripData?.rfqs || [];

      if (Array.isArray(rfqs) && rfqs.length > 0) {
        return extractFlightDetails(tripId, rfqs, tripData);
      }

      // Check for segments directly in trip data
      const segments = tripData?.data?.segments || tripData?.segments || [];
      if (segments.length > 0) {
        return extractFlightDetailsFromSegments(tripId, segments, tripData);
      }
    }

    return {
      tripId,
      status: 'error',
      error: `No RFQ or segment data found for trip ${tripId}`,
      segments: [],
    };
  } catch (error) {
    return {
      tripId,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      segments: [],
    };
  }
}

function extractFlightDetails(tripId: string, rfqs: any[], rawData: any): FlightDetails {
  const segments: FlightDetails['segments'] = [];

  for (const rfq of rfqs) {
    // Check for segments array (primary source)
    const rfqSegments = rfq.segments || [];

    for (const segment of rfqSegments) {
      const startAirport = segment.startAirportDetails || segment.startAirport || {};
      const endAirport = segment.endAirportDetails || segment.endAirport || {};
      const dateTime = segment.dateTime || {};
      const departureDateTime = segment.departureDateTime || {};

      segments.push({
        departureAirport: startAirport.icao || 'N/A',
        departureAirportName: startAirport.name || startAirport.city,
        arrivalAirport: endAirport.icao || 'N/A',
        arrivalAirportName: endAirport.name || endAirport.city,
        departureDate: dateTime.date ||
          departureDateTime.dateTimeLocal?.split('T')[0] ||
          departureDateTime.dateTimeUTC?.split('T')[0] ||
          'N/A',
        departureTime: dateTime.time ||
          departureDateTime.dateTimeLocal?.split('T')[1]?.slice(0, 5),
        passengers: segment.paxCount ? parseInt(segment.paxCount) : undefined,
      });
    }

    // Fallback: Check route object
    if (segments.length === 0 && rfq.route) {
      const route = rfq.route;
      if (route.departure?.airport?.icao && route.arrival?.airport?.icao) {
        segments.push({
          departureAirport: route.departure.airport.icao,
          departureAirportName: route.departure.airport.name || route.departure.airport.city,
          arrivalAirport: route.arrival.airport.icao,
          arrivalAirportName: route.arrival.airport.name || route.arrival.airport.city,
          departureDate: route.departure.date || 'N/A',
          departureTime: route.departure.time,
        });
      }
    }
  }

  return {
    tripId,
    status: segments.length > 0 ? 'success' : 'error',
    error: segments.length === 0 ? 'No segment data found in RFQs' : undefined,
    segments,
    rawData: segments.length === 0 ? rfqs[0] : undefined,
  };
}

function extractFlightDetailsFromSegments(tripId: string, tripSegments: any[], rawData: any): FlightDetails {
  const segments: FlightDetails['segments'] = [];

  for (const segment of tripSegments) {
    const startAirport = segment.startAirportDetails || segment.startAirport || {};
    const endAirport = segment.endAirportDetails || segment.endAirport || {};
    const dateTime = segment.dateTime || {};
    const departureDateTime = segment.departureDateTime || {};

    segments.push({
      departureAirport: startAirport.icao || 'N/A',
      departureAirportName: startAirport.name || startAirport.city,
      arrivalAirport: endAirport.icao || 'N/A',
      arrivalAirportName: endAirport.name || endAirport.city,
      departureDate: dateTime.date ||
        departureDateTime.dateTimeLocal?.split('T')[0] ||
        departureDateTime.dateTimeUTC?.split('T')[0] ||
        'N/A',
      departureTime: dateTime.time ||
        departureDateTime.dateTimeLocal?.split('T')[1]?.slice(0, 5),
      passengers: segment.paxCount ? parseInt(segment.paxCount) : undefined,
    });
  }

  return {
    tripId,
    status: segments.length > 0 ? 'success' : 'error',
    error: segments.length === 0 ? 'No segment data extracted' : undefined,
    segments,
    rawData: segments.length === 0 ? rawData : undefined,
  };
}

async function verifyAllTrips(): Promise<void> {
  console.log('🔍 Verifying Flight Details for All TripIDs\n');
  console.log(`Base URL: ${AVINODE_BASE_URL}`);
  console.log(`API Key: ${AVINODE_API_KEY ? `${AVINODE_API_KEY.slice(0, 20)}...` : '❌ Missing'}`);
  console.log(`\nChecking ${TRIP_IDS.length} TripIDs...\n`);
  console.log('='.repeat(100));

  const results: FlightDetails[] = [];

  for (const tripId of TRIP_IDS) {
    console.log(`\n📡 Fetching ${tripId}...`);
    const details = await fetchTripDetails(tripId);
    results.push(details);

    if (details.status === 'success') {
      console.log(`   ✅ ${tripId} - Found ${details.segments.length} segment(s)`);
      for (const segment of details.segments) {
        console.log(`      📍 ${segment.departureAirport} → ${segment.arrivalAirport}`);
        console.log(`         Date: ${segment.departureDate}${segment.departureTime ? ` at ${segment.departureTime}` : ''}`);
        if (segment.departureAirportName) {
          console.log(`         From: ${segment.departureAirportName}`);
        }
        if (segment.arrivalAirportName) {
          console.log(`         To: ${segment.arrivalAirportName}`);
        }
        if (segment.passengers) {
          console.log(`         PAX: ${segment.passengers}`);
        }
      }
    } else {
      console.log(`   ❌ ${tripId} - Error: ${details.error}`);
      if (details.rawData) {
        console.log(`      Raw keys: ${Object.keys(details.rawData).join(', ')}`);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  console.log('\n' + '='.repeat(100));
  console.log('\n📊 SUMMARY\n');

  console.log('| TripID  | Status  | Route                    | Date       | Time  |');
  console.log('|---------|---------|--------------------------|------------|-------|');

  for (const result of results) {
    const status = result.status === 'success' ? '✅' : '❌';
    if (result.segments.length > 0) {
      for (const segment of result.segments) {
        const route = `${segment.departureAirport} → ${segment.arrivalAirport}`;
        console.log(`| ${result.tripId.padEnd(7)} | ${status.padEnd(7)} | ${route.padEnd(24)} | ${segment.departureDate.padEnd(10)} | ${(segment.departureTime || 'N/A').padEnd(5)} |`);
      }
    } else {
      console.log(`| ${result.tripId.padEnd(7)} | ${status.padEnd(7)} | ${(result.error || 'No data').slice(0, 24).padEnd(24)} | ${'N/A'.padEnd(10)} | ${'N/A'.padEnd(5)} |`);
    }
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  console.log('\n📈 Results:');
  console.log(`   ✅ Success: ${successCount}/${TRIP_IDS.length}`);
  console.log(`   ❌ Errors: ${errorCount}/${TRIP_IDS.length}`);
}

// Run verification
if (!AVINODE_API_KEY) {
  console.error('❌ AVINODE_API_KEY is not set in .env.local');
  process.exit(1);
}

verifyAllTrips()
  .then(() => {
    console.log('\n✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
