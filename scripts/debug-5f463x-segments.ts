#!/usr/bin/env tsx
/**
 * Debug script for 5F463X - Check segments data
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
  console.log('Number of RFQs:', rfqs.length);

  if (rfqs.length > 0) {
    const rfq = rfqs[0];
    console.log('\n=== SEGMENTS DATA ===');
    console.log('Has segments:', !!rfq.segments);
    console.log('segments type:', typeof rfq.segments);
    console.log('segments isArray:', Array.isArray(rfq.segments));

    if (rfq.segments) {
      console.log('\nFull segments structure:');
      console.log(JSON.stringify(rfq.segments, null, 2));
    }
  }
}

main().catch(console.error);
