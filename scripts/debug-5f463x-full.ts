#!/usr/bin/env tsx
/**
 * Debug script for 5F463X - Full dump of sellerLift structure
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

  // Try with different parameters
  const url = `${AVINODE_BASE_URL}/trips/${tripId}?quotebreakdown=true&includepricing=true&expandall=true`;
  console.log('URL:', url);

  const response = await fetch(url, { headers });
  const data = await response.json();

  const rfqs = data?.data?.rfqs || [];
  console.log('\nFound', rfqs.length, 'RFQs\n');

  // Look for "Unanswered" quotes with prices (matching screenshot)
  const unansweredWithPrices = [
    'Charter Airlines', // $38,650
    'Dominion Av', // $39,700
    'Hera Flight', // $42,350
    'Skyward Avi', // $43,050
    'Northeaster', // $43,100
  ];

  for (const rfq of rfqs) {
    const sellerName = rfq.sellerCompany?.displayName || 'Unknown';
    const isTarget = unansweredWithPrices.some(name => sellerName.includes(name.split(' ')[0]));

    if (!isTarget) continue;

    console.log('='.repeat(80));
    console.log('SELLER:', sellerName);
    console.log('RFQ ID:', rfq.id);
    console.log('='.repeat(80));

    // Dump the FULL sellerLift structure
    if (rfq.sellerLift && rfq.sellerLift.length > 0) {
      const lift = rfq.sellerLift[0];
      console.log('\nFULL sellerLift[0] structure:');
      console.log(JSON.stringify(lift, null, 2));
    }

    // Also check for any other fields that might have pricing
    const pricingFields = ['price', 'pricing', 'sellerPrice', 'totalPrice', 'amount', 'cost', 'fee', 'total'];
    console.log('\nChecking RFQ-level fields:');
    for (const field of pricingFields) {
      if (rfq[field] !== undefined) {
        console.log(`  ${field}:`, rfq[field]);
      }
    }

    console.log('\n');
  }

  // Also try the RFQ endpoint directly
  console.log('\n\n=== Trying direct RFQ endpoint ===\n');

  const rfqId = 'arfq-114464426'; // Charter Airlines
  const rfqUrl = `${AVINODE_BASE_URL}/rfqs/${rfqId.replace('arfq-', '')}?quotebreakdown=true&taildetails=true`;
  console.log('RFQ URL:', rfqUrl);

  const rfqResponse = await fetch(rfqUrl, { headers });
  console.log('RFQ Response status:', rfqResponse.status);

  if (rfqResponse.ok) {
    const rfqData = await rfqResponse.json();
    console.log('\nRFQ Data:');
    console.log(JSON.stringify(rfqData, null, 2));
  } else {
    const errText = await rfqResponse.text();
    console.log('RFQ Error:', errText);
  }
}

main().catch(console.error);
