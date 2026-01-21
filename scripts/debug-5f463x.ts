#!/usr/bin/env tsx
/**
 * Debug script for 5F463X trip ID
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

  const rfqs = data?.data?.rfqs || [];
  console.log('\nFound', rfqs.length, 'RFQs');

  // Find quotes with "Unanswered" status and prices
  console.log('\n=== Looking for pricing data in RFQs ===\n');

  for (const rfq of rfqs) {
    console.log('--- RFQ:', rfq.id, '---');
    console.log('Seller:', rfq.sellerCompany?.displayName);

    // Check sellerLift for pricing
    if (rfq.sellerLift && rfq.sellerLift.length > 0) {
      for (const lift of rfq.sellerLift) {
        console.log('  sellerLift:');
        console.log('    sourcingDisplayStatus:', lift.sourcingDisplayStatus);
        console.log('    aircraftType:', lift.aircraftType);

        // Check for pricing in various places
        if (lift.sellerPrice) {
          console.log('    ✅ sellerPrice:', JSON.stringify(lift.sellerPrice));
        }
        if (lift.pricing) {
          console.log('    ✅ pricing:', JSON.stringify(lift.pricing));
        }
        if (lift.price) {
          console.log('    ✅ price:', lift.price);
        }
        if (lift.totalPrice) {
          console.log('    ✅ totalPrice:', lift.totalPrice);
        }

        // Check links for quotes
        if (lift.links?.quotes && lift.links.quotes.length > 0) {
          const quoteLink = lift.links.quotes[0];
          console.log('    Quote link ID:', quoteLink.id);

          // Try to fetch the quote
          const quoteId = quoteLink.id.replace('aquote-', '');
          const quoteUrl = `${AVINODE_BASE_URL}/quotes/${quoteId}?quotebreakdown=true&taildetails=true`;

          try {
            const quoteResp = await fetch(quoteUrl, { headers });
            if (quoteResp.ok) {
              const quoteData = await quoteResp.json();
              console.log('    ✅ Quote fetched successfully!');
              console.log('    Quote sellerPrice:', quoteData?.data?.sellerPrice);
            } else {
              console.log('    ❌ Quote fetch failed:', quoteResp.status);
            }
          } catch (e) {
            console.log('    ❌ Quote fetch error');
          }
        }
      }
    }
    console.log('');
  }

  // Also check the trip-level data
  console.log('\n=== Trip-level data ===');
  console.log('Trip ID:', data?.data?.id);
  console.log('Trip status:', data?.data?.status);
  console.log('Trip legs:', data?.data?.legs?.length);

  if (data?.data?.legs && data.data.legs.length > 0) {
    const leg = data.data.legs[0];
    console.log('First leg departure:', leg.departureAirportId);
    console.log('First leg arrival:', leg.arrivalAirportId);
    console.log('First leg date:', leg.departureDate);
  }
}

main().catch(console.error);
