#!/usr/bin/env npx tsx

/**
 * Test script to retrieve RFQs for a Trip ID using the Avinode API
 * Usage: npx tsx test-rfq.ts <TRIP_ID>
 * Example: npx tsx test-rfq.ts LS3MY2
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '.env.local') });
config({ path: resolve(__dirname, '../../../.env.local') });

// Get trip ID from command line argument
const tripId = process.argv[2] || 'LS3MY2';

// Get required environment variables
const apiToken = process.env.API_TOKEN || process.env.AVINODE_API_TOKEN;
const authToken = process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN;
const baseUrl = process.env.BASE_URI || process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

// Validate credentials
if (!apiToken) {
  console.error('❌ Error: API_TOKEN or AVINODE_API_TOKEN not found in .env.local');
  process.exit(1);
}

if (!authToken) {
  console.error('❌ Error: AUTHENTICATION_TOKEN or AVINODE_BEARER_TOKEN not found in .env.local');
  process.exit(1);
}

// Remove "Bearer " prefix if present
const bearerToken = authToken.startsWith('Bearer ') ? authToken.substring(7) : authToken;

console.log('🔍 Testing Avinode API: Get RFQs for Trip ID:', tripId);
console.log('');
console.log('📋 Configuration:');
console.log('  Base URL:', baseUrl);
console.log('  API Token:', apiToken.substring(0, 20) + '... (truncated)');
console.log('  Auth Token:', bearerToken.substring(0, 20) + '... (truncated)');
console.log('');

// Construct API endpoint
const endpoint = `${baseUrl}/rfqs/${tripId}`;

// Generate ISO-8601 UTC timestamp with proper format
// Avinode requires: YYYY-MM-DDTHH:mm:ss.sssZ (3-digit milliseconds, Z suffix)
const now = new Date();
const timestamp = now.toISOString(); // This already produces correct format: 2026-01-03T00:15:55.300Z

console.log('📡 Making API request...');
console.log('  Endpoint:', endpoint);
console.log('  Method: GET');
console.log('  Timestamp:', timestamp);
console.log('');

// Query parameters per API documentation
const queryParams = new URLSearchParams({
  taildetails: 'true',
  typedetails: 'true',
  timestamps: 'true',
  quotebreakdown: 'true',
  latestquote: 'true',
  tailphotos: 'true',
  typephotos: 'true',
});

const fullUrl = `${endpoint}?${queryParams.toString()}`;

try {
  const response = await axios.get(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      'X-Avinode-ApiToken': apiToken,
      'Authorization': `Bearer ${bearerToken}`,
      'X-Avinode-SentTimestamp': timestamp,
      'X-Avinode-ApiVersion': 'v1.0',
      'X-Avinode-Product': 'Jetvision/1.0.0',
      'Accept-Encoding': 'gzip',
    },
    timeout: 30000,
  });

  console.log('✅ Request successful');
  console.log('  HTTP Status:', response.status);
  console.log('');
  console.log('📦 Response Body:');
  console.log(JSON.stringify(response.data, null, 2));
  console.log('');

  // Analyze response structure
  const data = response.data;
  
  if (Array.isArray(data)) {
    console.log(`✅ Response is an array with ${data.length} RFQ(s)`);
    
    if (data.length === 0) {
      console.log('⚠️  Warning: Array is empty - no RFQs found for Trip ID', tripId);
    } else {
      console.log('');
      console.log('📋 RFQ Summary:');
      data.forEach((rfq: any, index: number) => {
        console.log(`  RFQ ${index + 1}:`);
        console.log(`    ID: ${rfq.rfq_id || rfq.id || 'N/A'}`);
        console.log(`    Trip ID: ${rfq.trip_id || 'N/A'}`);
        console.log(`    Status: ${rfq.status || 'N/A'}`);
        
        // Count quotes
        const quotes = rfq.quotes || rfq.requests || rfq.responses || [];
        const quotesFromLifts = rfq.lifts && Array.isArray(rfq.lifts) 
          ? rfq.lifts.flatMap((lift: any) => lift.quotes || [])
          : [];
        const totalQuotes = quotes.length + quotesFromLifts.length;
        
        console.log(`    Quotes: ${totalQuotes}`);
        if (rfq.route) {
          console.log(`    Route: ${rfq.route.departure?.airport?.icao || 'N/A'} → ${rfq.route.arrival?.airport?.icao || 'N/A'}`);
        }
        console.log('');
      });
    }
  } else if (data && typeof data === 'object') {
    console.log('📦 Response is an object');
    
    // Check for nested arrays
    if (Array.isArray(data.data)) {
      console.log(`✅ Found nested array in response.data with ${data.data.length} RFQ(s)`);
    }
    if (Array.isArray(data.rfqs)) {
      console.log(`✅ Found nested array in response.rfqs with ${data.rfqs.length} RFQ(s)`);
    }
    if (Array.isArray(data.results)) {
      console.log(`✅ Found nested array in response.results with ${data.results.length} RFQ(s)`);
    }
    
    // Check if it's a single RFQ
    if (data.rfq_id) {
      console.log('📋 Single RFQ Response:');
      console.log(`  RFQ ID: ${data.rfq_id}`);
      console.log(`  Trip ID: ${data.trip_id || 'N/A'}`);
      console.log(`  Status: ${data.status || 'N/A'}`);
      
      const quotes = data.quotes || data.requests || data.responses || [];
      console.log(`  Quotes: ${quotes.length}`);
    }
  } else {
    console.log('⚠️  Unexpected response type:', typeof data);
  }

} catch (error: any) {
  console.error('❌ Request failed');
  
  if (error.response) {
    // Server responded with error status
    console.error('  HTTP Status:', error.response.status);
    console.error('  Status Text:', error.response.statusText);
    console.error('');
    console.error('  Response Body:');
    console.error(JSON.stringify(error.response.data, null, 2));
    
    if (error.response.status === 401) {
      console.error('');
      console.error('⚠️  Authentication failed - check your API_TOKEN and AUTHENTICATION_TOKEN');
    } else if (error.response.status === 404) {
      console.error('');
      console.error(`⚠️  Trip ID not found: ${tripId}`);
    } else if (error.response.status === 429) {
      console.error('');
      console.error('⚠️  Rate limited - wait a moment and try again');
    }
  } else if (error.request) {
    console.error('  No response received from server');
    console.error('  Error:', error.message);
  } else {
    console.error('  Error:', error.message);
  }
  
  process.exit(1);
}

console.log('');
console.log('✅ Test completed');
