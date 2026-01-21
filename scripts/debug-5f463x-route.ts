#!/usr/bin/env tsx
/**
 * Debug script for 5F463X - Check route data location
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const AVINODE_API_KEY = process.env.AVINODE_API_KEY || '';
const AVINODE_API_TOKEN = process.env.AVINODE_API_TOKEN || '';
const AVINODE_BASE_URL = process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

async function main() {
  const tripId = '5F463X';
  const headers = {
    'Authorization': `Bearer ${AVINODE_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Avinode-ApiToken': AVINODE_API_TOKEN,
    'X-Avinode-ApiVersion': 'v1.0',
    'X-Avinode-Product': 'Jetvision/1.0.0',
    'X-Avinode-SentTimestamp': new Date().toISOString(),
  };

  console.log('Fetching trip:', tripId);
  const response = await fetch(`${AVINODE_BASE_URL}/trips/${tripId}`, { headers });
  const data = await response.json();

  // Check trip-level data
  console.log('\n=== TRIP LEVEL DATA ===');
  console.log('data.data keys:', Object.keys(data?.data || {}));
  console.log('Has legs:', !!data?.data?.legs);

  if (data?.data?.legs && data.data.legs.length > 0) {
    console.log('\nLegs array:');
    for (const leg of data.data.legs) {
      console.log('  Leg:', {
        id: leg.id,
        departureAirportId: leg.departureAirportId,
        arrivalAirportId: leg.arrivalAirportId,
        departureDate: leg.departureDate,
        departureDateLocal: leg.departureDateLocal,
        pax: leg.pax,
      });
    }
  }

  // Check RFQ-level route data
  console.log('\n=== RFQ LEVEL ROUTE DATA ===');
  const rfqs = data?.data?.rfqs || [];
  console.log('Number of RFQs:', rfqs.length);

  if (rfqs.length > 0) {
    const rfq = rfqs[0];
    console.log('\nFirst RFQ route structure:');
    console.log('  Has route:', !!rfq.route);
    console.log('  route:', rfq.route);
    console.log('  Has legs:', !!rfq.legs);
    console.log('  Has departureAirport:', !!rfq.departureAirport);
    console.log('  Has arrivalAirport:', !!rfq.arrivalAirport);
    console.log('  RFQ keys:', Object.keys(rfq));

    // Check sellerLift route data
    if (rfq.sellerLift && rfq.sellerLift.length > 0) {
      const lift = rfq.sellerLift[0];
      console.log('\nFirst sellerLift route structure:');
      console.log('  Has route:', !!lift.route);
      console.log('  route:', lift.route);
      console.log('  sellerLift keys:', Object.keys(lift));
    }
  }

  // Compare with a working trip
  console.log('\n\n=== COMPARING WITH Z7P7XV (has quotes_received: 19) ===');
  const workingTripId = 'Z7P7XV';
  const workingResponse = await fetch(`${AVINODE_BASE_URL}/trips/${workingTripId}`, { headers });
  const workingData = await workingResponse.json();

  console.log('Working trip legs:');
  if (workingData?.data?.legs && workingData.data.legs.length > 0) {
    for (const leg of workingData.data.legs) {
      console.log('  Leg:', {
        departureAirportId: leg.departureAirportId,
        arrivalAirportId: leg.arrivalAirportId,
      });
    }
  }

  console.log('\nWorking trip first RFQ route:');
  const workingRfqs = workingData?.data?.rfqs || [];
  if (workingRfqs.length > 0) {
    console.log('  route:', workingRfqs[0].route);
    console.log('  Has buyerLift:', !!workingRfqs[0].buyerLift);
    if (workingRfqs[0].buyerLift && workingRfqs[0].buyerLift.length > 0) {
      console.log('  buyerLift[0] route:', workingRfqs[0].buyerLift[0].route);
    }
  }
}

main().catch(console.error);
