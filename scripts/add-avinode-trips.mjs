/**
 * Add Avinode Trips to Database
 *
 * Fetches trip details from Avinode API and creates flight request entries.
 * ONLY creates entries when API data is successfully retrieved.
 *
 * Usage: node scripts/add-avinode-trips.mjs [--dry-run] [tripId1 tripId2 ...]
 *
 * If no trip IDs provided, uses the default list from testing-tripids.md
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { execSync } from 'child_process';

// Load env vars
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Avinode API config - matches .env.local variable names
// API_TOKEN / AVINODE_API_TOKEN = 36 char UUID for X-Avinode-ApiToken header
// AVINODE_API_KEY = JWT bearer token for Authorization header (preferred)
// AUTHENTICATION_TOKEN = alternate JWT bearer token
const BASE_URL = process.env.BASE_URI || process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';
const API_TOKEN = process.env.API_TOKEN || process.env.AVINODE_API_TOKEN;
const AUTH_TOKEN = (process.env.AVINODE_API_KEY || process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN || '').replace(/^Bearer\s+/i, '');
const EXTERNAL_ID = process.env.AVINODE_EXTERNAL_ID || process.env.EXTERNAL_ID || '';

const DRY_RUN = process.argv.includes('--dry-run');

// Default trip IDs from testing-tripids.md
const DEFAULT_TRIP_IDS = [
  'URT74T',
  'JXWTXS',
  'Z7P7XV',
  'JZLHJF',
  'R3WVBX',
  'UEBTAE',
  'R4QFRX',
  'T68XYN',
  '2HD9UB',
  '5F463X',
  'VZ2UUC',
];

// Get trip IDs from command line args or use defaults
const cmdArgs = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
const TRIP_IDS = cmdArgs.length > 0 ? cmdArgs : DEFAULT_TRIP_IDS;

/**
 * Fetch trip data from Avinode using curl (matching bash script pattern)
 */
function fetchTripFromAvinode(tripId) {
  const timestamp = new Date().toISOString();

  // Build curl command with proper quoting for shell
  let cmd = `/usr/bin/curl -s -X GET "${BASE_URL}/trips/${tripId}" `;
  cmd += `-H "Content-Type: application/json" `;
  cmd += `-H "Accept: application/json" `;
  cmd += `-H "X-Avinode-ApiToken: ${API_TOKEN}" `;
  cmd += `-H "Authorization: Bearer ${AUTH_TOKEN}" `;
  cmd += `-H "X-Avinode-SentTimestamp: ${timestamp}" `;
  cmd += `-H "X-Avinode-ApiVersion: v1.0" `;
  cmd += `-H "X-Avinode-Product: Jetvision/1.0.0"`;

  // Add ActAsAccount header only if EXTERNAL_ID is set
  if (EXTERNAL_ID) {
    cmd += ` -H "X-Avinode-ActAsAccount: ${EXTERNAL_ID}"`;
  }

  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000, shell: '/bin/bash' });
    return JSON.parse(result);
  } catch (error) {
    console.error(`  Error fetching trip ${tripId}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch RFQ details from Avinode
 */
function fetchRfqFromAvinode(rfqId) {
  const timestamp = new Date().toISOString();

  let cmd = `/usr/bin/curl -s -X GET "${BASE_URL}/rfqs/${rfqId}" `;
  cmd += `-H "Content-Type: application/json" `;
  cmd += `-H "Accept: application/json" `;
  cmd += `-H "X-Avinode-ApiToken: ${API_TOKEN}" `;
  cmd += `-H "Authorization: Bearer ${AUTH_TOKEN}" `;
  cmd += `-H "X-Avinode-SentTimestamp: ${timestamp}" `;
  cmd += `-H "X-Avinode-ApiVersion: v1.0" `;
  cmd += `-H "X-Avinode-Product: Jetvision/1.0.0"`;

  if (EXTERNAL_ID) {
    cmd += ` -H "X-Avinode-ActAsAccount: ${EXTERNAL_ID}"`;
  }

  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000, shell: '/bin/bash' });
    return JSON.parse(result);
  } catch (error) {
    console.error(`  Error fetching RFQ ${rfqId}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch quote details from Avinode
 */
function fetchQuoteFromAvinode(quoteId) {
  const timestamp = new Date().toISOString();

  let cmd = `/usr/bin/curl -s -X GET "${BASE_URL}/quotes/${quoteId}" `;
  cmd += `-H "Content-Type: application/json" `;
  cmd += `-H "Accept: application/json" `;
  cmd += `-H "X-Avinode-ApiToken: ${API_TOKEN}" `;
  cmd += `-H "Authorization: Bearer ${AUTH_TOKEN}" `;
  cmd += `-H "X-Avinode-SentTimestamp: ${timestamp}" `;
  cmd += `-H "X-Avinode-ApiVersion: v1.0" `;
  cmd += `-H "X-Avinode-Product: Jetvision/1.0.0"`;

  if (EXTERNAL_ID) {
    cmd += ` -H "X-Avinode-ActAsAccount: ${EXTERNAL_ID}"`;
  }

  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000, shell: '/bin/bash' });
    return JSON.parse(result);
  } catch (error) {
    console.error(`  Error fetching quote ${quoteId}: ${error.message}`);
    return null;
  }
}

/**
 * Extract route info from trip/RFQ data
 */
function extractRouteInfo(tripData, rfqData) {
  // Try to get segments from RFQ first, then trip
  const segments = rfqData?.data?.segments || rfqData?.data?.legs ||
                   tripData?.data?.segments || tripData?.data?.legs || [];

  if (segments.length === 0) {
    return null;
  }

  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1] || firstSeg;

  // Extract airports
  const depAirport = firstSeg?.startAirport?.icao ||
                     firstSeg?.startAirport?.iata ||
                     firstSeg?.departureAirport?.icao ||
                     firstSeg?.departure?.airport;

  const arrAirport = lastSeg?.endAirport?.icao ||
                     lastSeg?.endAirport?.iata ||
                     lastSeg?.arrivalAirport?.icao ||
                     lastSeg?.arrival?.airport ||
                     firstSeg?.endAirport?.icao;

  // Extract date
  const depDate = firstSeg?.dateTime?.date ||
                  firstSeg?.departureDate ||
                  firstSeg?.departure?.date;

  // Extract passengers
  const paxCount = firstSeg?.paxCount ||
                   rfqData?.data?.pax ||
                   tripData?.data?.pax;
  const passengers = paxCount ? parseInt(String(paxCount), 10) : 1;

  if (!depAirport || !arrAirport) {
    return null;
  }

  return {
    departure_airport: depAirport,
    arrival_airport: arrAirport,
    departure_date: depDate || new Date().toISOString().split('T')[0],
    passengers: passengers || 1,
  };
}

/**
 * Get the default ISO agent ID
 */
async function getDefaultIsoAgentId() {
  const { data: agents, error } = await supabase
    .from('iso_agents')
    .select('id')
    .eq('is_active', true)
    .limit(1);

  if (error || !agents?.length) {
    throw new Error('No active ISO agent found. Please create one first.');
  }

  return agents[0].id;
}

/**
 * Generate initial request message
 */
function generateInitialRequestMessage(tripId, routeInfo, quoteCount) {
  let formattedDate = routeInfo.departure_date;
  try {
    const [year, month, day] = routeInfo.departure_date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  } catch (e) { /* keep original */ }

  const parts = [
    `I need a charter flight from ${routeInfo.departure_airport} to ${routeInfo.arrival_airport}`,
    `for ${routeInfo.passengers} passenger${routeInfo.passengers > 1 ? 's' : ''}`,
    `on ${formattedDate}`,
  ];

  if (quoteCount > 0) {
    parts.push(`[Trip ${tripId}: ${quoteCount} quotes received]`);
  } else {
    parts.push(`[Trip ID: ${tripId}]`);
  }

  return parts.join(' ') + '.';
}

/**
 * Extract quote IDs from trip response
 */
function extractQuoteIds(tripData) {
  const quoteIds = [];
  const rfqs = tripData?.data?.rfqs || [];

  for (const rfq of rfqs) {
    const sellerLifts = rfq.sellerLift || [];
    for (const lift of sellerLifts) {
      const quotes = lift.links?.quotes || [];
      for (const quote of quotes) {
        if (quote.id) {
          quoteIds.push(quote.id);
        }
      }
    }
  }

  return [...new Set(quoteIds)]; // Deduplicate
}

/**
 * Main function
 */
async function main() {
  console.log('==============================================');
  console.log('   ADD AVINODE TRIPS TO DATABASE');
  console.log('==============================================');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will create entries)'}`);
  console.log(`Avinode API: ${BASE_URL}`);
  console.log(`API Token: ${API_TOKEN ? API_TOKEN.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`Auth Token: ${AUTH_TOKEN ? AUTH_TOKEN.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`External ID: ${EXTERNAL_ID || '(not set)'}`);
  console.log(`Trips to add: ${TRIP_IDS.length}`);
  console.log('');

  if (!API_TOKEN || !AUTH_TOKEN) {
    console.error('ERROR: Missing Avinode API credentials.');
    console.error('Required in .env.local:');
    console.error('  - API_TOKEN or AVINODE_API_TOKEN');
    console.error('  - AUTHENTICATION_TOKEN or AVINODE_BEARER_TOKEN or AVINODE_API_KEY');
    process.exit(1);
  }

  // Get ISO agent
  let isoAgentId;
  try {
    isoAgentId = await getDefaultIsoAgentId();
    console.log(`ISO Agent: ${isoAgentId.substring(0, 8)}...`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;
  let quotesStored = 0;

  for (const tripId of TRIP_IDS) {
    console.log(`\n--- Processing Trip: ${tripId} ---`);

    // Fetch trip data
    const tripData = fetchTripFromAvinode(tripId);

    // Check for API errors
    if (!tripData || tripData.meta?.errors?.length > 0) {
      const errorMsg = tripData?.meta?.errors?.[0]?.title || 'Unknown error';
      console.log(`  ✗ API Error: ${errorMsg}`);
      console.log('  Skipping - will not create entry without valid data');
      failCount++;
      continue;
    }

    // Get RFQ ID from trip
    const rfqRefs = tripData.data?.rfqs || [];
    const rfqId = rfqRefs[0]?.id;
    let rfqData = null;

    if (rfqId) {
      console.log(`  Fetching RFQ: ${rfqId}`);
      rfqData = fetchRfqFromAvinode(rfqId);
    }

    // Extract route info
    const routeInfo = extractRouteInfo(tripData, rfqData);

    if (!routeInfo) {
      console.log('  ✗ Could not extract route info from trip data');
      console.log('  Skipping - will not create entry without valid data');
      failCount++;
      continue;
    }

    console.log(`  Route: ${routeInfo.departure_airport} -> ${routeInfo.arrival_airport}`);
    console.log(`  Date: ${routeInfo.departure_date}`);
    console.log(`  Passengers: ${routeInfo.passengers}`);

    // Extract quote IDs
    const quoteIds = extractQuoteIds(tripData);
    console.log(`  Quotes found: ${quoteIds.length}`);

    // Build deep link
    const deepLink = tripData.data?.actions?.viewInAvinode?.href ||
                     `https://sandbox.avinode.com/marketplace/mvc/trips/buying/${tripId}`;

    if (DRY_RUN) {
      console.log('  [DRY RUN] Would create request and message');
      successCount++;
      continue;
    }

    // Create request
    const requestRecord = {
      iso_agent_id: isoAgentId,
      avinode_trip_id: tripId,
      avinode_rfq_id: rfqId || null,
      avinode_deep_link: deepLink,
      departure_airport: routeInfo.departure_airport,
      arrival_airport: routeInfo.arrival_airport,
      departure_date: routeInfo.departure_date,
      passengers: routeInfo.passengers,
      status: quoteIds.length > 0 ? 'awaiting_quotes' : 'trip_created',
      session_status: 'active', // Valid values: active, expired, revoked
      conversation_type: 'flight_request',
      operators_contacted: rfqRefs.length,
      quotes_received: quoteIds.length,
      message_count: 1,
      subject: `Charter flight ${routeInfo.departure_airport} to ${routeInfo.arrival_airport}`,
    };

    const { data: request, error: reqError } = await supabase
      .from('requests')
      .insert(requestRecord)
      .select('id')
      .single();

    if (reqError) {
      console.error(`  ✗ Error creating request: ${reqError.message}`);
      failCount++;
      continue;
    }

    console.log(`  ✓ Created request: ${request.id.substring(0, 8)}...`);

    // Create initial message
    const messageContent = generateInitialRequestMessage(tripId, routeInfo, quoteIds.length);

    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        request_id: request.id,
        sender_type: 'iso_agent',
        sender_iso_agent_id: isoAgentId,
        content: messageContent,
        content_type: 'text',
        status: 'sent',
        metadata: {
          avinode_trip_id: tripId,
          created_by: 'add-avinode-trips.mjs',
        },
      });

    if (msgError) {
      console.error(`  ✗ Error creating message: ${msgError.message}`);
    } else {
      console.log(`  ✓ Created initial message`);
    }

    // Fetch and store quotes
    for (const quoteId of quoteIds) {
      const quoteData = fetchQuoteFromAvinode(quoteId);

      if (!quoteData || quoteData.meta?.errors?.length > 0) {
        continue;
      }

      const totalPrice = quoteData.data?.sellerPrice?.price || 0;
      const operatorName = quoteData.data?.sellerCompany?.displayName || 'Unknown Operator';
      const aircraftType = quoteData.data?.lift?.aircraftType || 'Unknown';

      const { error: quoteError } = await supabase
        .from('quotes')
        .insert({
          request_id: request.id,
          operator_id: quoteData.data?.sellerCompany?.id || 'unknown',
          operator_name: operatorName,
          aircraft_type: aircraftType,
          aircraft_tail_number: quoteData.data?.lift?.aircraftTail || null,
          base_price: totalPrice,
          total_price: totalPrice,
          status: 'received',
          metadata: {
            avinode_quote_id: quoteId,
            avinode_trip_id: tripId,
            currency: quoteData.data?.sellerPrice?.currency || 'USD',
            seller_message: quoteData.data?.sellerMessage,
          },
        });

      if (!quoteError) {
        console.log(`    ✓ Stored quote: $${totalPrice} (${aircraftType})`);
        quotesStored++;
      }
    }

    // Update request with actual quote count for this trip
    const { count: actualQuoteCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('request_id', request.id);

    if (actualQuoteCount > 0) {
      await supabase
        .from('requests')
        .update({ quotes_received: actualQuoteCount })
        .eq('id', request.id);
    }

    successCount++;
  }

  console.log('\n==============================================');
  console.log('                  SUMMARY');
  console.log('==============================================');
  console.log(`Trips processed:   ${TRIP_IDS.length}`);
  console.log(`Successful:        ${successCount}`);
  console.log(`Failed (skipped):  ${failCount}`);
  console.log(`Quotes stored:     ${quotesStored}`);

  if (DRY_RUN) {
    console.log('\nThis was a DRY RUN. No changes were made.');
  } else if (failCount > 0) {
    console.log('\n⚠️  Some trips failed due to API errors.');
    console.log('   Check your API credentials and try again.');
  } else {
    console.log('\n✓ All trips added successfully!');
  }
}

main().catch(console.error);
