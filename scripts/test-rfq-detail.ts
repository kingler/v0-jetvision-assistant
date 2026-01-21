#!/usr/bin/env tsx
/**
 * Test script to examine the detailed RFQ/quote structure from Avinode API
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const AVINODE_API_KEY = process.env.AVINODE_API_KEY || '';
const AVINODE_API_TOKEN = process.env.AVINODE_API_TOKEN || '';
const AVINODE_BASE_URL = process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

async function fetchRFQDetail(tripId: string) {
  const headers = {
    'Authorization': `Bearer ${AVINODE_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Avinode-ApiToken': AVINODE_API_TOKEN,
    'X-Avinode-ApiVersion': 'v1.0',
    'X-Avinode-Product': 'Jetvision/1.0.0',
    'X-Avinode-SentTimestamp': new Date().toISOString(),
  };

  console.log(`\n🔍 Examining RFQ detail structure for: ${tripId}\n`);

  // Get trip first
  const tripResponse = await fetch(`${AVINODE_BASE_URL}/trips/${tripId}`, { headers });
  const tripData = await tripResponse.json();

  // Get RFQs from trip
  const rfqs = tripData?.data?.rfqs || [];
  console.log(`Found ${rfqs.length} RFQs in trip response`);

  if (rfqs.length === 0) {
    console.log('No RFQs found');
    return;
  }

  // Examine first RFQ
  const firstRfq = rfqs[0];
  console.log('\n📦 First RFQ:');
  console.log('  ID:', firstRfq.id);
  console.log('  Seller:', firstRfq.sellerCompany?.displayName);

  // Look at sellerLift structure
  if (firstRfq.sellerLift && firstRfq.sellerLift.length > 0) {
    console.log('\n🔍 sellerLift structure:');
    const lift = firstRfq.sellerLift[0];
    console.log('  Lift ID:', lift.id);
    console.log('  Lift keys:', Object.keys(lift).join(', '));

    // Check for pricing on lift
    if (lift.sellerPrice) {
      console.log('  ✅ sellerPrice:', JSON.stringify(lift.sellerPrice));
    }
    if (lift.totalPrice) {
      console.log('  ✅ totalPrice:', JSON.stringify(lift.totalPrice));
    }
    if (lift.aircraftType) {
      console.log('  ✅ aircraftType:', lift.aircraftType);
    }
    if (lift.aircraftTail) {
      console.log('  ✅ aircraftTail:', lift.aircraftTail);
    }

    // Check quotes link
    const quoteLinks = lift.links?.quotes || [];
    console.log(`  Quote links: ${quoteLinks.length}`);

    if (quoteLinks.length > 0) {
      const quoteRef = quoteLinks[0];
      console.log('\n📡 Fetching individual quote:', quoteRef.id);

      // Extract quote ID
      const quoteId = quoteRef.id.replace('aquote-', '');
      const quoteUrl = `${AVINODE_BASE_URL}/quotes/${quoteId}?quotebreakdown=true&taildetails=true`;
      console.log('  URL:', quoteUrl);

      try {
        const quoteResponse = await fetch(quoteUrl, { headers });
        console.log('  Status:', quoteResponse.status, quoteResponse.statusText);

        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          console.log('\n✅ Quote data:');
          console.log(JSON.stringify(quoteData, null, 2).slice(0, 3000));
        } else {
          const errorText = await quoteResponse.text();
          console.log('  ❌ Error:', errorText.slice(0, 500));
        }
      } catch (e) {
        console.log('  ❌ Fetch failed:', e);
      }
    }
  }

  // Also check if there's pricing directly in the RFQ response (some APIs include it)
  console.log('\n🔍 Checking for pricing in RFQ response:');
  console.log('  Has quotes array:', !!firstRfq.quotes);
  console.log('  Has pricing:', !!firstRfq.pricing);
  console.log('  Has price:', !!firstRfq.price);
  console.log('  Has sellerPrice:', !!firstRfq.sellerPrice);

  // Print full first RFQ for inspection
  console.log('\n📋 Full first RFQ structure (truncated):');
  console.log(JSON.stringify(firstRfq, null, 2).slice(0, 4000));
}

const tripId = process.argv[2] || 'T68XYN';
fetchRFQDetail(tripId)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });
