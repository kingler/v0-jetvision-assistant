/**
 * Add Initial Flight Request Messages
 *
 * Ensures each TripID has an initial flight request message from the user.
 * Creates messages like: "I need a flight from KTEB to KVNY for 4 passengers on March 25, 2026"
 *
 * - If no message exists, creates one
 * - If the existing message doesn't look like a proper flight request (e.g., "get_rfq XXX"),
 *   updates it to the proper format
 *
 * Usage: node scripts/add-initial-flight-requests.mjs [--dry-run]
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

// Avinode API config
const BASE_URL = process.env.BASE_URI || process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';
const API_TOKEN = process.env.API_TOKEN || process.env.AVINODE_API_TOKEN;
const AUTH_TOKEN = (process.env.AVINODE_API_KEY || process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN || '').replace(/^Bearer\s+/i, '');
const EXTERNAL_ID = process.env.AVINODE_EXTERNAL_ID || process.env.EXTERNAL_ID || '';

const DRY_RUN = process.argv.includes('--dry-run');

// Trip IDs from testing-tripids.md
const TRIP_IDS = [
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

/**
 * Format date nicely
 */
function formatDate(dateStr) {
  if (!dateStr) return 'a future date';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Check if message looks like a proper flight request
 */
function isProperFlightRequest(content) {
  if (!content) return false;

  // These patterns indicate proper flight requests
  const properPatterns = [
    /I need a (charter )?flight from/i,
    /flight from \w+ to \w+/i,
    /\d+ passenger/i,
  ];

  // These patterns indicate improper messages that need to be replaced
  const improperPatterns = [
    /^get_rfq\s+/i,
    /^fetch_trip/i,
    /^test/i,
  ];

  // If message matches any improper pattern, it's not proper
  for (const pattern of improperPatterns) {
    if (pattern.test(content)) {
      return false;
    }
  }

  // If message matches proper patterns, it's valid
  for (const pattern of properPatterns) {
    if (pattern.test(content)) {
      return true;
    }
  }

  return false;
}

/**
 * Fetch trip data from Avinode API
 */
function fetchTripFromAvinode(tripId) {
  const timestamp = new Date().toISOString();

  let cmd = `/usr/bin/curl -s -X GET "${BASE_URL}/trips/${tripId}" `;
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
    return null;
  }
}

/**
 * Extract route info from trip/RFQ data
 */
function extractRouteInfo(tripData, rfqData) {
  const segments = rfqData?.data?.segments || rfqData?.data?.legs ||
                   tripData?.data?.segments || tripData?.data?.legs || [];

  if (segments.length === 0) {
    return null;
  }

  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1] || firstSeg;

  const depAirport = firstSeg?.startAirport?.icao ||
                     firstSeg?.startAirport?.iata ||
                     firstSeg?.departureAirport?.icao ||
                     firstSeg?.departure?.airport;

  const arrAirport = lastSeg?.endAirport?.icao ||
                     lastSeg?.endAirport?.iata ||
                     lastSeg?.arrivalAirport?.icao ||
                     lastSeg?.arrival?.airport ||
                     firstSeg?.endAirport?.icao;

  const depDate = firstSeg?.dateTime?.date ||
                  firstSeg?.departureDate ||
                  firstSeg?.departure?.date;

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
 * Generate flight request message
 */
function generateFlightRequestMessage(request) {
  const dep = request.departure_airport || 'TBD';
  const arr = request.arrival_airport || 'TBD';
  const pax = request.passengers || 1;
  const date = formatDate(request.departure_date);

  return `I need a flight from ${dep} to ${arr} for ${pax} passenger${pax > 1 ? 's' : ''} on ${date}.`;
}

/**
 * Main function
 */
async function main() {
  console.log('==============================================');
  console.log('   ADD INITIAL FLIGHT REQUEST MESSAGES');
  console.log('==============================================');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will create/update messages)'}`);
  console.log(`Trip IDs to check: ${TRIP_IDS.length}`);
  console.log(`Avinode API: ${BASE_URL}`);
  console.log('');

  // Fetch requests for these trip IDs
  const { data: requests, error: reqError } = await supabase
    .from('requests')
    .select('id, avinode_trip_id, avinode_rfq_id, departure_airport, arrival_airport, departure_date, passengers, iso_agent_id')
    .in('avinode_trip_id', TRIP_IDS);

  if (reqError) {
    console.error('Error fetching requests:', reqError.message);
    process.exit(1);
  }

  if (!requests || requests.length === 0) {
    console.log('No requests found for the specified trip IDs.');
    console.log('Run `node scripts/add-avinode-trips.mjs` first to create the requests.');
    process.exit(0);
  }

  console.log(`Found ${requests.length} requests matching trip IDs.\n`);

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let routeUpdatedCount = 0;
  let errorCount = 0;

  for (const request of requests) {
    const tripId = request.avinode_trip_id;
    console.log(`--- Trip: ${tripId} ---`);
    console.log(`  Request ID: ${request.id.substring(0, 8)}...`);

    // Check if route info is missing
    let routeInfo = {
      departure_airport: request.departure_airport,
      arrival_airport: request.arrival_airport,
      departure_date: request.departure_date,
      passengers: request.passengers,
    };

    const needsRouteInfo = !request.departure_airport || !request.arrival_airport ||
                           request.departure_airport === request.arrival_airport;

    if (needsRouteInfo) {
      console.log('  Route info incomplete, fetching from Avinode...');

      const tripData = fetchTripFromAvinode(tripId);
      if (tripData && !tripData.meta?.errors?.length) {
        const rfqRefs = tripData.data?.rfqs || [];
        const rfqId = rfqRefs[0]?.id;
        let rfqData = null;

        if (rfqId) {
          rfqData = fetchRfqFromAvinode(rfqId);
        }

        const extractedRoute = extractRouteInfo(tripData, rfqData);
        if (extractedRoute) {
          routeInfo = extractedRoute;
          console.log(`  Fetched route: ${routeInfo.departure_airport} -> ${routeInfo.arrival_airport}`);

          // Update request with route info
          if (!DRY_RUN) {
            await supabase
              .from('requests')
              .update({
                departure_airport: routeInfo.departure_airport,
                arrival_airport: routeInfo.arrival_airport,
                departure_date: routeInfo.departure_date,
                passengers: routeInfo.passengers,
              })
              .eq('id', request.id);
            routeUpdatedCount++;
          }
        }
      }
    }

    console.log(`  Route: ${routeInfo.departure_airport || '?'} -> ${routeInfo.arrival_airport || '?'}`);
    console.log(`  Date: ${routeInfo.departure_date}`);
    console.log(`  Passengers: ${routeInfo.passengers}`);

    // Check if request already has an iso_agent message
    const { data: existingMessages, error: msgCheckError } = await supabase
      .from('messages')
      .select('id, content, sender_type, created_at')
      .eq('request_id', request.id)
      .eq('sender_type', 'iso_agent')
      .order('created_at', { ascending: true })
      .limit(1);

    if (msgCheckError) {
      console.error(`  Error checking messages: ${msgCheckError.message}`);
      errorCount++;
      continue;
    }

    const existingMessage = existingMessages?.[0];
    const expectedContent = generateFlightRequestMessage(routeInfo);

    if (existingMessage) {
      const isProper = isProperFlightRequest(existingMessage.content);

      if (isProper) {
        console.log(`  Has proper message: "${existingMessage.content?.substring(0, 50)}..."`);
        skippedCount++;
        continue;
      }

      // Message exists but is improper - update it
      console.log(`  Improper message found: "${existingMessage.content?.substring(0, 30)}..."`);
      console.log(`  Updating to: "${expectedContent}"`);

      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            content: expectedContent,
            metadata: {
              avinode_trip_id: tripId,
              updated_by: 'add-initial-flight-requests.mjs',
              is_initial_request: true,
              previous_content: existingMessage.content,
            },
          })
          .eq('id', existingMessage.id);

        if (updateError) {
          console.error(`  Error updating message: ${updateError.message}`);
          errorCount++;
          continue;
        }
        console.log('  Message updated successfully');
      } else {
        console.log('  [DRY RUN] Would update message');
      }
      updatedCount++;
      continue;
    }

    // No message exists - create new one
    console.log(`  No iso_agent message found, creating: "${expectedContent}"`);

    if (DRY_RUN) {
      console.log('  [DRY RUN] Would create message');
      addedCount++;
      continue;
    }

    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        request_id: request.id,
        sender_type: 'iso_agent',
        sender_iso_agent_id: request.iso_agent_id,
        content: expectedContent,
        content_type: 'text',
        status: 'sent',
        metadata: {
          avinode_trip_id: tripId,
          created_by: 'add-initial-flight-requests.mjs',
          is_initial_request: true,
        },
      });

    if (insertError) {
      console.error(`  Error creating message: ${insertError.message}`);
      errorCount++;
      continue;
    }

    console.log('  Message created successfully');
    addedCount++;

    // Update request message count
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('request_id', request.id);

    if (count !== null) {
      await supabase
        .from('requests')
        .update({ message_count: count })
        .eq('id', request.id);
    }
  }

  // Check for trip IDs not found in database
  const foundTripIds = requests.map(r => r.avinode_trip_id);
  const missingTripIds = TRIP_IDS.filter(id => !foundTripIds.includes(id));

  if (missingTripIds.length > 0) {
    console.log(`\nTrip IDs not found in database: ${missingTripIds.join(', ')}`);
    console.log('Run `node scripts/add-avinode-trips.mjs` to create these requests first.');
  }

  console.log('\n==============================================');
  console.log('                  SUMMARY');
  console.log('==============================================');
  console.log(`Requests checked:       ${requests.length}`);
  console.log(`Messages added:         ${addedCount}`);
  console.log(`Messages updated:       ${updatedCount}`);
  console.log(`Already proper:         ${skippedCount}`);
  console.log(`Routes updated:         ${routeUpdatedCount}`);
  console.log(`Errors:                 ${errorCount}`);
  console.log(`Missing trip IDs:       ${missingTripIds.length}`);

  if (DRY_RUN) {
    console.log('\nThis was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to apply the changes.');
  } else if (addedCount > 0 || updatedCount > 0) {
    console.log('\nInitial flight request messages processed successfully!');
  }
}

main().catch(console.error);
