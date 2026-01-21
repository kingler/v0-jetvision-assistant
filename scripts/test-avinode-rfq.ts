#!/usr/bin/env tsx

/**
 * Test Script: Direct Avinode API RFQ Fetch
 *
 * Tests the Avinode API directly to see what data is returned for a trip ID.
 * This helps debug why RFQs are not loading in Step 3.
 *
 * Usage:
 *   pnpm tsx scripts/test-avinode-rfq.ts <TRIP_ID>
 *   pnpm tsx scripts/test-avinode-rfq.ts URT74T
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const AVINODE_API_KEY = process.env.AVINODE_API_KEY || '';
const AVINODE_API_TOKEN = process.env.AVINODE_API_TOKEN || '';
const AVINODE_BASE_URL = process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

async function testAvinodeRFQ(tripId: string) {
  console.log('🔍 Testing Avinode API RFQ Fetch...\n');
  console.log(`Trip ID: ${tripId}`);
  console.log(`Base URL: ${AVINODE_BASE_URL}`);
  console.log(`API Key: ${AVINODE_API_KEY ? `${AVINODE_API_KEY.slice(0, 20)}...` : '❌ Missing'}`);
  console.log(`API Token: ${AVINODE_API_TOKEN ? `${AVINODE_API_TOKEN.slice(0, 20)}...` : '❌ Missing'}`);
  console.log();

  if (!AVINODE_API_KEY) {
    console.error('❌ AVINODE_API_KEY is not set in .env.local');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${AVINODE_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Avinode-ApiToken': AVINODE_API_TOKEN,
    'X-Avinode-ApiVersion': 'v1.0',
    'X-Avinode-Product': 'Jetvision/1.0.0',
    'X-Avinode-SentTimestamp': new Date().toISOString(),
  };

  // Try GET /trips/{tripId} first
  console.log(`📡 Calling GET /trips/${tripId}...`);
  try {
    const tripUrl = `${AVINODE_BASE_URL}/trips/${tripId}`;
    console.log(`   URL: ${tripUrl}`);

    const tripResponse = await fetch(tripUrl, {
      method: 'GET',
      headers,
    });

    console.log(`   Status: ${tripResponse.status} ${tripResponse.statusText}`);

    if (tripResponse.ok) {
      const tripData = await tripResponse.json();
      console.log('\n✅ Trip API Response:');
      console.log(JSON.stringify(tripData, null, 2).slice(0, 2000));

      // Check for RFQs in the response
      const rfqs = tripData?.data?.rfqs || tripData?.rfqs || [];
      console.log(`\n📊 RFQs found: ${Array.isArray(rfqs) ? rfqs.length : 'N/A (not an array)'}`);

      if (Array.isArray(rfqs) && rfqs.length > 0) {
        console.log('\n📦 RFQ Details:');
        rfqs.forEach((rfq: any, index: number) => {
          console.log(`   ${index + 1}. RFQ ID: ${rfq.id || rfq.rfq_id || 'N/A'}`);
          console.log(`      Status: ${rfq.status || 'N/A'}`);
          console.log(`      Quotes: ${rfq.quotes?.length || 0}`);
          console.log(`      Has lifts: ${!!rfq.lifts}`);
          console.log(`      Has sellerLift: ${!!rfq.sellerLift}`);
          console.log(`      Has segments: ${!!rfq.segments}`);
          console.log(`      Keys: ${Object.keys(rfq).slice(0, 10).join(', ')}`);
        });
        // Show full first RFQ structure
        console.log('\n🔍 First RFQ Full Structure:');
        console.log(JSON.stringify(rfqs[0], null, 2).slice(0, 3000));
      }
    } else {
      const errorText = await tripResponse.text();
      console.log(`\n❌ Trip API Error Response: ${errorText.slice(0, 500)}`);
    }
  } catch (error) {
    console.error(`\n❌ Trip API Request failed:`, error instanceof Error ? error.message : error);
  }

  // Also try GET /rfqs/{tripId} as fallback
  console.log(`\n📡 Calling GET /rfqs/${tripId}...`);
  try {
    const rfqUrl = `${AVINODE_BASE_URL}/rfqs/${tripId}?taildetails=true&typedetails=true&timestamps=true&tailphotos=true&typephotos=true`;
    console.log(`   URL: ${rfqUrl}`);

    const rfqResponse = await fetch(rfqUrl, {
      method: 'GET',
      headers,
    });

    console.log(`   Status: ${rfqResponse.status} ${rfqResponse.statusText}`);

    if (rfqResponse.ok) {
      const rfqData = await rfqResponse.json();
      console.log('\n✅ RFQ API Response:');
      console.log(JSON.stringify(rfqData, null, 2).slice(0, 2000));
    } else {
      const errorText = await rfqResponse.text();
      console.log(`\n❌ RFQ API Error Response: ${errorText.slice(0, 500)}`);
    }
  } catch (error) {
    console.error(`\n❌ RFQ API Request failed:`, error instanceof Error ? error.message : error);
  }
}

// Get trip ID from command line
const tripId = process.argv[2] || 'URT74T';

testAvinodeRFQ(tripId)
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
