#!/usr/bin/env tsx
/**
 * Test the full getRFQFlights flow with detailed logging
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { AvinodeClient } from '../lib/mcp/clients/avinode-client';

async function test(tripId: string) {
  console.log(`\n🔍 Testing full getRFQFlights flow for: ${tripId}\n`);

  const client = new AvinodeClient({
    apiKey: process.env.AVINODE_API_KEY || '',
    baseUrl: process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api',
  });

  // Monkey-patch fetchQuoteDetails to add logging
  const originalFetch = (client as any).fetchQuoteDetails.bind(client);
  (client as any).fetchQuoteDetails = async (quoteId: string) => {
    console.log(`📡 fetchQuoteDetails called with: "${quoteId}"`);
    try {
      const result = await originalFetch(quoteId);
      console.log(`   ✅ Success! Price: ${result?.sellerPrice?.price}`);
      return result;
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
      throw error;
    }
  };

  const result = await client.getRFQFlights(tripId);

  console.log('\n📊 Results:');
  console.log(`   Total flights: ${result.flights.length}`);
  console.log(`   Total quotes: ${result.total_quotes}`);

  if (result.flights.length > 0) {
    console.log('\n📦 First 3 flights:');
    result.flights.slice(0, 3).forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.operatorName} - ${f.aircraftType}`);
      console.log(`      Price: ${f.currency} ${f.totalPrice}`);
      console.log(`      Status: ${f.rfqStatus}`);
    });
  }
}

const tripId = process.argv[2] || 'T68XYN';
test(tripId).catch(console.error);
