#!/usr/bin/env npx tsx
/**
 * Avinode Authentication Debug Script
 * 
 * Tests authentication and shows exactly what headers are being sent
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../mcp-servers/avinode-mcp-server/.env.local') });
config({ path: resolve(__dirname, '../.env.local') });

const apiToken = (process.env.API_TOKEN || process.env.AVINODE_API_TOKEN || '').trim();
const authToken = (process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN || '').trim();
const baseUrl = process.env.BASE_URI || process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

console.log('=== Authentication Debug ===\n');
console.log('Base URL:', baseUrl);
console.log('API Token:', apiToken ? `${apiToken.substring(0, 8)}... (${apiToken.length} chars)` : 'NOT SET');
console.log('Auth Token:', authToken ? `${authToken.substring(0, 20)}... (${authToken.length} chars)` : 'NOT SET');
console.log('');

// Decode JWT if possible
if (authToken) {
  try {
    const parts = authToken.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('JWT Payload:');
      console.log(JSON.stringify(payload, null, 2));
      console.log('');
    }
  } catch (e) {
    console.log('Could not decode JWT:', e);
  }
}

// Show exact headers that will be sent
console.log('=== Headers to be sent ===');
const headers = {
  'Content-Type': 'application/json',
  'X-Avinode-ApiToken': apiToken,
  'Authorization': `Bearer ${authToken}`,
  'X-Avinode-SentTimestamp': new Date().toISOString(),
  'X-Avinode-ApiVersion': 'v1.0',
  'X-Avinode-Product': 'Jetvision/1.0.0',
  'Accept-Encoding': 'gzip',
};

Object.entries(headers).forEach(([key, value]) => {
  if (key === 'Authorization' || key === 'X-Avinode-ApiToken') {
    const displayValue = typeof value === 'string' && value.length > 30 
      ? `${value.substring(0, 30)}...` 
      : value;
    console.log(`${key}: ${displayValue}`);
  } else {
    console.log(`${key}: ${value}`);
  }
});

console.log('\n=== Making test request ===');

// Make a simple test request
const testRequest = {
  sourcing: true,
  segments: [
    {
      startAirport: { icao: 'KTEB' },
      endAirport: { icao: 'KLAX' },
      dateTime: {
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '10:00',
        departure: true,
        local: true,
      },
      paxCount: '4',
      paxSegment: true,
      paxTBD: false,
      timeTBD: false,
    },
  ],
  criteria: {
    requiredLift: [],
    requiredPartnerships: [],
    maxFuelStopsPerSegment: 0,
    includeLiftUpgrades: true,
    maxInitialPositioningTimeMinutes: 0,
  },
};

(async () => {
  try {
    const response = await axios.post(`${baseUrl}/trips`, testRequest, { headers });
    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    process.exit(0);
  } catch (error: any) {
    console.log('\n❌ ERROR!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Status Text:', error.response.statusText);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.log('Response Headers:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.log('No response received');
      console.log('Request:', error.request);
    } else {
      console.log('Error:', error.message);
    }
    process.exit(1);
  }
})();

