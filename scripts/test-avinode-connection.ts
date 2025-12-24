#!/usr/bin/env npx tsx
/**
 * Simple Avinode Connection Test Script
 *
 * Tests the Avinode API connection by creating a trip request.
 * Uses the corrected request format per Avinode API documentation.
 *
 * Usage:
 *   npx tsx scripts/test-avinode-connection.ts
 *
 * Required environment variables (from .env.local or mcp-servers/avinode-mcp-server/.env.local):
 *   - API_TOKEN (or AVINODE_API_TOKEN)
 *   - AUTHENTICATION_TOKEN (or AVINODE_BEARER_TOKEN)
 *   - BASE_URI (or AVINODE_BASE_URL) - optional in development (defaults to sandbox with warning),
 *     but REQUIRED in production to prevent accidental sandbox usage
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getAvinodeClient } from '../mcp-servers/avinode-mcp-server/src/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from multiple locations
config({ path: resolve(__dirname, '../mcp-servers/avinode-mcp-server/.env.local') });
config({ path: resolve(__dirname, '../.env.local') });

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Test trip creation with corrected Avinode API format
 */
async function testCreateTrip() {
  logSection('Avinode Connection Test');

  // Check environment variables
  const apiToken = (process.env.API_TOKEN || process.env.AVINODE_API_TOKEN || '').trim();
  const authToken = (process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN || '').trim();
  const baseUrl = process.env.BASE_URI || process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

  logInfo('Configuration:');
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  API Token: ${apiToken ? `${apiToken.substring(0, 8)}... (length: ${apiToken.length})` : 'NOT SET'}`);
  console.log(`  Auth Token: ${authToken ? `${authToken.substring(0, 20)}... (length: ${authToken.length})` : 'NOT SET'}`);

  if (!apiToken || !authToken) {
    logError('Missing required environment variables!');
    console.log('\nPlease set the following in .env.local:');
    console.log('  API_TOKEN=your-api-token');
    console.log('  AUTHENTICATION_TOKEN=your-bearer-token');
    process.exit(1);
  }

  // Validate token formats
  // Normalize auth token by removing "Bearer " prefix if present
  let normalizedAuthToken = authToken;
  if (authToken.startsWith('Bearer ')) {
    logWarning('Auth token already includes "Bearer " prefix - removing it');
    normalizedAuthToken = authToken.replace(/^Bearer\s+/i, '');
    process.env.AUTHENTICATION_TOKEN = normalizedAuthToken;
  }

  // Check if token looks like a JWT (should start with eyJ)
  // Use normalized token for accurate validation
  if (!normalizedAuthToken.startsWith('eyJ')) {
    logWarning('Auth token does not appear to be a JWT (should start with "eyJ")');
  }

  try {
    // Initialize client
    logInfo('Initializing Avinode client...');
    const client = getAvinodeClient();
    logSuccess('Client initialized');

    // Test trip creation with corrected format per Avinode API documentation
    // @see https://developer.avinodegroup.com/reference/createtrip
    logSection('Creating Trip Request');

    const tripRequest = {
      externalTripId: 'TEST-CONNECTION-' + Date.now(),
      sourcing: true, // Required: enables sourcing/search functionality
      segments: [
        {
          startAirport: {
            icao: 'KTEB', // Teterboro Airport
          },
          endAirport: {
            icao: 'KLAX', // Los Angeles International
          },
          dateTime: {
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
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
        requiredLift: [
          {
            aircraftCategory: 'Heavy jet',
            aircraftType: '',
            aircraftTail: '',
          },
        ],
        requiredPartnerships: [],
        maxFuelStopsPerSegment: 0,
        includeLiftUpgrades: true,
        maxInitialPositioningTimeMinutes: 0,
      },
    };

    logInfo('Request payload:');
    console.log(JSON.stringify(tripRequest, null, 2));

    logInfo('Sending request to Avinode API...');
    const response = await client.post('/trips', tripRequest);

    logSection('Response Received');

    // Handle Avinode API response format
    // Response structure: { data: { id, href, actions: { searchInAvinode: { href } } } }
    const tripData = response.data || response;
    const tripId = tripData.id || tripData.trip_id;
    const actions = tripData.actions || {};
    const deepLink = actions.searchInAvinode?.href || actions.viewInAvinode?.href || tripData.href;

    logSuccess('Trip created successfully!');
    console.log('\nResponse data:');
    console.log(JSON.stringify(response, null, 2));

    console.log('\n' + '-'.repeat(60));
    logInfo('Trip Details:');
    console.log(`  Trip ID: ${tripId}`);
    console.log(`  Deep Link: ${deepLink || 'N/A'}`);
    if (actions.searchInAvinode) {
      console.log(`  Search Link: ${actions.searchInAvinode.href}`);
    }
    if (actions.viewInAvinode) {
      console.log(`  View Link: ${actions.viewInAvinode.href}`);
    }
    if (actions.cancel) {
      console.log(`  Cancel Link: ${actions.cancel.href}`);
    }

    logSection('Test Summary');
    logSuccess('✅ Connection test PASSED');
    logSuccess('✅ Authentication successful');
    logSuccess('✅ Trip creation successful');
    logSuccess('✅ Request format is correct');

    return { success: true, tripId, deepLink, response };

  } catch (error: any) {
    logSection('Error Details');
    logError('Connection test FAILED');

    if (error.response) {
      // Axios error with response
      const status = error.response.status;
      const statusText = error.response.statusText;
      const data = error.response.data;

      logError(`HTTP ${status} ${statusText}`);
      console.log('\nResponse data:');
      console.log(JSON.stringify(data, null, 2));

      if (status === 401) {
        logWarning('Authentication failed - check your API_TOKEN and AUTHENTICATION_TOKEN');
      } else if (status === 403) {
        logWarning('Forbidden - valid token but insufficient permissions');
      } else if (status === 422) {
        logWarning('Validation error - check request format');
      } else if (status === 429) {
        logWarning('Rate limited - wait before retrying');
      }
    } else if (error.request) {
      logError('No response from server');
      logWarning('Check network connection and API endpoint');
    } else {
      logError(`Error: ${error.message}`);
    }

    console.log('\nFull error:');
    console.error(error);

    return { success: false, error: error.message };
  }
}

// Run the test
testCreateTrip()
  .then((result) => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((error) => {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });

