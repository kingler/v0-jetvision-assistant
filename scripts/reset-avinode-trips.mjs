/**
 * Reset Avinode Trips - Replace all existing trips with new ones
 *
 * This script:
 * 1. Purges all existing Avinode trip data from the database
 * 2. Fetches trip details from Avinode API for each new trip ID
 * 3. Creates new request records with flight details
 * 4. Creates initial request messages for each trip
 * 5. Fetches quotes and operator messages
 *
 * Usage: node scripts/reset-avinode-trips.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { config } from 'dotenv';

// Load env vars
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Avinode API config
const AVINODE_BASE_URL = process.env.BASE_URI || process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';
const API_TOKEN = process.env.API_TOKEN || process.env.AVINODE_API_TOKEN;
const AUTH_TOKEN = (process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN || '').replace(/^bearer\s+/i, '');

const DRY_RUN = process.argv.includes('--dry-run');

// New trip IDs to add
const NEW_TRIP_IDS = [
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

// Create Avinode API client
const avinode = axios.create({
  baseURL: AVINODE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Avinode-ApiToken': API_TOKEN,
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'X-Avinode-ApiVersion': 'v1.0',
    'X-Avinode-Product': 'Jetvision/1.0.0',
    'Accept-Encoding': 'gzip',
  },
  timeout: 30000,
});

// Add request interceptor
avinode.interceptors.request.use((config) => {
  config.headers['X-Avinode-SentTimestamp'] = new Date().toISOString();
  return config;
});

/**
 * Get the default ISO agent ID (first active agent)
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
 * Purge all existing Avinode trip data
 */
async function purgeExistingTripData() {
  console.log('\n=== PURGING EXISTING TRIP DATA ===\n');

  // Get all requests with avinode_trip_id
  const { data: existingRequests, error: fetchError } = await supabase
    .from('requests')
    .select('id, avinode_trip_id')
    .not('avinode_trip_id', 'is', null);

  if (fetchError) {
    console.error('Error fetching existing requests:', fetchError);
    return { deleted: 0, error: fetchError };
  }

  if (!existingRequests?.length) {
    console.log('No existing trip data to purge.');
    return { deleted: 0 };
  }

  console.log(`Found ${existingRequests.length} existing requests with trip IDs:`);
  existingRequests.forEach(r => console.log(`  - ${r.avinode_trip_id} (${r.id.substring(0, 8)}...)`));

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would delete:');
    console.log(`  - ${existingRequests.length} requests`);
    console.log('  - All associated messages, quotes, proposals, and webhook events');
    return { deleted: 0, wouldDelete: existingRequests.length };
  }

  const requestIds = existingRequests.map(r => r.id);

  // Delete in order due to foreign key constraints
  // 1. Delete messages
  const { error: msgError, count: msgCount } = await supabase
    .from('messages')
    .delete()
    .in('request_id', requestIds);
  if (msgError) console.error('Error deleting messages:', msgError);
  else console.log(`  Deleted ${msgCount || 0} messages`);

  // 2. Delete proposals
  const { error: propError, count: propCount } = await supabase
    .from('proposals')
    .delete()
    .in('request_id', requestIds);
  if (propError) console.error('Error deleting proposals:', propError);
  else console.log(`  Deleted ${propCount || 0} proposals`);

  // 3. Delete quotes
  const { error: quoteError, count: quoteCount } = await supabase
    .from('quotes')
    .delete()
    .in('request_id', requestIds);
  if (quoteError) console.error('Error deleting quotes:', quoteError);
  else console.log(`  Deleted ${quoteCount || 0} quotes`);

  // 4. Delete webhook events
  const { error: webhookError, count: webhookCount } = await supabase
    .from('avinode_webhook_events')
    .delete()
    .in('request_id', requestIds);
  if (webhookError) console.error('Error deleting webhook events:', webhookError);
  else console.log(`  Deleted ${webhookCount || 0} webhook events`);

  // 5. Delete workflow states
  const { error: workflowError, count: workflowCount } = await supabase
    .from('workflow_states')
    .delete()
    .in('request_id', requestIds);
  if (workflowError) console.error('Error deleting workflow states:', workflowError);
  else console.log(`  Deleted ${workflowCount || 0} workflow states`);

  // 6. Delete agent executions
  const { error: execError, count: execCount } = await supabase
    .from('agent_executions')
    .delete()
    .in('request_id', requestIds);
  if (execError) console.error('Error deleting agent executions:', execError);
  else console.log(`  Deleted ${execCount || 0} agent executions`);

  // 7. Finally delete requests
  const { error: reqError, count: reqCount } = await supabase
    .from('requests')
    .delete()
    .in('id', requestIds);
  if (reqError) console.error('Error deleting requests:', reqError);
  else console.log(`  Deleted ${reqCount || existingRequests.length} requests`);

  console.log('\nPurge complete.');
  return { deleted: existingRequests.length };
}

/**
 * Fetch trip details from Avinode API
 */
async function fetchTripFromAvinode(tripId) {
  try {
    console.log(`  Fetching trip ${tripId} from Avinode API...`);
    const response = await avinode.get(`/trips/${tripId}`, {
      params: {
        taildetails: true,
        quotedetails: true,
      }
    });

    const tripPayload = response.data?.data ?? response.data;

    if (!tripPayload) {
      console.log(`  No trip data returned for ${tripId}`);
      return null;
    }

    // Get RFQ details for route info
    const rfqRefs = tripPayload.rfqs || [];
    if (rfqRefs.length === 0) {
      console.log(`  No RFQs found for trip ${tripId}`);
      return { tripId, tripPayload, rfqs: [], segments: [], quotes: [] };
    }

    // Fetch first RFQ for route details
    const firstRfqRef = rfqRefs[0];
    const rfqId = firstRfqRef.id;

    console.log(`  Fetching RFQ details: ${rfqId}`);
    const rfqResponse = await avinode.get(`/rfqs/${rfqId}`, {
      params: { taildetails: true, quotedetails: true }
    });

    const rfqData = rfqResponse.data?.data ?? rfqResponse.data;
    if (!rfqData) {
      console.log(`  No RFQ data returned for ${rfqId}`);
      return { tripId, tripPayload, rfqs: rfqRefs, segments: [], quotes: [] };
    }

    // Extract segment/route info
    const segments = rfqData.legs || rfqData.segments || [];
    const quotes = rfqData.quotes || [];

    // Build deep link
    const deepLink = tripPayload.actions?.viewInAvinode?.href ||
                     tripPayload.actions?.searchInAvinode?.href ||
                     `https://sandbox.avinode.com/marketplace/mvc/trips/buying/${tripPayload.id}`;

    return {
      tripId,
      tripPayload,
      rfqId,
      rfqData,
      rfqs: rfqRefs,
      segments,
      quotes,
      deepLink,
    };
  } catch (error) {
    const status = error.response?.status;
    if (status === 404) {
      console.log(`  Trip ${tripId} not found in Avinode`);
    } else {
      console.log(`  Error fetching trip ${tripId}: ${status || error.message}`);
    }
    return null;
  }
}

/**
 * Extract route info from trip data
 */
function extractRouteInfo(tripData) {
  if (!tripData?.segments?.length) {
    return {
      departure_airport: 'TBD',
      arrival_airport: 'TBD',
      departure_date: new Date().toISOString().split('T')[0],
      passengers: 1,
    };
  }

  const firstSeg = tripData.segments[0];
  const lastSeg = tripData.segments[tripData.segments.length - 1] || firstSeg;

  // Extract departure airport
  const depAirport = firstSeg?.startAirport?.icao ||
                     firstSeg?.startAirport?.iata ||
                     firstSeg?.departureAirport?.icao ||
                     firstSeg?.departure?.airport ||
                     'TBD';

  // Extract arrival airport
  const arrAirport = lastSeg?.endAirport?.icao ||
                     lastSeg?.endAirport?.iata ||
                     lastSeg?.arrivalAirport?.icao ||
                     lastSeg?.arrival?.airport ||
                     firstSeg?.endAirport?.icao ||
                     'TBD';

  // Extract date
  const depDate = firstSeg?.dateTime?.date ||
                  firstSeg?.departureDate ||
                  firstSeg?.departure?.date ||
                  new Date().toISOString().split('T')[0];

  // Extract passengers
  const paxCount = firstSeg?.paxCount ||
                   tripData.rfqData?.pax ||
                   tripData.tripPayload?.pax ||
                   1;
  const passengers = typeof paxCount === 'string' ? parseInt(paxCount, 10) : paxCount;

  return {
    departure_airport: depAirport,
    arrival_airport: arrAirport,
    departure_date: depDate,
    passengers: passengers || 1,
  };
}

/**
 * Generate initial request message based on trip details
 */
function generateInitialRequestMessage(tripId, routeInfo, quoteCount, rfqCount) {
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
  } catch (e) {
    // Keep original format
  }

  const parts = ['I need a charter flight'];

  if (routeInfo.departure_airport !== 'TBD' && routeInfo.arrival_airport !== 'TBD') {
    parts.push(`from ${routeInfo.departure_airport} to ${routeInfo.arrival_airport}`);
  }

  if (routeInfo.passengers) {
    parts.push(`for ${routeInfo.passengers} passenger${routeInfo.passengers > 1 ? 's' : ''}`);
  }

  if (formattedDate) {
    parts.push(`on ${formattedDate}`);
  }

  // Add trip info
  const infoStr = quoteCount > 0
    ? `[Trip ${tripId}: ${quoteCount} quotes from ${rfqCount} operators]`
    : `[Trip ID: ${tripId}]`;
  parts.push(infoStr);

  return parts.join(' ') + '.';
}

/**
 * Create a new request record for a trip
 */
async function createRequestForTrip(tripId, tripData, isoAgentId) {
  const routeInfo = extractRouteInfo(tripData);
  const quoteCount = tripData?.quotes?.length || 0;
  const rfqCount = tripData?.rfqs?.length || 0;

  const requestRecord = {
    iso_agent_id: isoAgentId,
    avinode_trip_id: tripId,
    avinode_rfq_id: tripData?.rfqId || null,
    avinode_deep_link: tripData?.deepLink || `https://sandbox.avinode.com/marketplace/mvc/trips/buying/${tripId}`,
    departure_airport: routeInfo.departure_airport,
    arrival_airport: routeInfo.arrival_airport,
    departure_date: routeInfo.departure_date,
    passengers: routeInfo.passengers,
    status: quoteCount > 0 ? 'awaiting_quotes' : 'trip_created',
    session_status: quoteCount > 0 ? 'quotes_received' : 'active',
    conversation_type: 'flight_request',
    operators_contacted: rfqCount,
    quotes_received: quoteCount,
    message_count: 1, // Initial message
    subject: `Charter flight ${routeInfo.departure_airport} to ${routeInfo.arrival_airport}`,
  };

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create request:`);
    console.log(`    Trip: ${tripId}`);
    console.log(`    Route: ${routeInfo.departure_airport} -> ${routeInfo.arrival_airport}`);
    console.log(`    Date: ${routeInfo.departure_date}`);
    console.log(`    Passengers: ${routeInfo.passengers}`);
    console.log(`    Quotes: ${quoteCount}`);
    return { id: 'dry-run-id', ...requestRecord, routeInfo, quoteCount, rfqCount };
  }

  const { data, error } = await supabase
    .from('requests')
    .insert(requestRecord)
    .select('id')
    .single();

  if (error) {
    console.error(`  Error creating request for ${tripId}:`, error);
    return null;
  }

  console.log(`  Created request: ${data.id.substring(0, 8)}...`);
  return { ...data, ...requestRecord, routeInfo, quoteCount, rfqCount };
}

/**
 * Create initial message for a request
 */
async function createInitialMessage(requestId, isoAgentId, tripId, routeInfo, quoteCount, rfqCount) {
  const content = generateInitialRequestMessage(tripId, routeInfo, quoteCount, rfqCount);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create message: "${content.substring(0, 60)}..."`);
    return { id: 'dry-run-msg-id' };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      request_id: requestId,
      sender_type: 'iso_agent',
      sender_iso_agent_id: isoAgentId,
      content,
      content_type: 'text',
      status: 'sent',
      metadata: {
        generated: true,
        avinode_trip_id: tripId,
        created_by: 'reset-avinode-trips.mjs',
      },
    })
    .select('id')
    .single();

  if (error) {
    console.error(`  Error creating message:`, error);
    return null;
  }

  console.log(`  Created initial message: "${content.substring(0, 50)}..."`);
  return data;
}

/**
 * Fetch and store quotes for a trip
 */
async function fetchAndStoreQuotes(requestId, tripData, tripId) {
  if (!tripData?.tripPayload?.rfqs) return 0;

  let quotesStored = 0;

  for (const rfq of tripData.tripPayload.rfqs) {
    const sellerLifts = rfq.sellerLift || [];

    for (const lift of sellerLifts) {
      const quoteRefs = lift.links?.quotes || [];

      for (const quoteRef of quoteRefs) {
        try {
          const quoteResponse = await avinode.get(`/quotes/${quoteRef.id}`);
          const quoteData = quoteResponse.data?.data ?? quoteResponse.data;

          if (!quoteData) continue;

          const totalPrice = quoteData.sellerPrice?.price || 0;

          const quoteRecord = {
            request_id: requestId,
            operator_id: quoteData.sellerCompany?.id || 'unknown',
            operator_name: quoteData.sellerCompany?.displayName || 'Unknown Operator',
            aircraft_type: quoteData.lift?.aircraftType || 'Unknown',
            aircraft_tail_number: quoteData.lift?.aircraftTail || null,
            base_price: totalPrice,
            total_price: totalPrice,
            status: 'received',
            metadata: {
              avinode_quote_id: quoteData.id,
              avinode_trip_id: tripId,
              currency: quoteData.sellerPrice?.currency || 'USD',
              seller_message: quoteData.sellerMessage,
              aircraft_category: quoteData.lift?.aircraftCategory,
              seller_company_id: quoteData.sellerCompany?.id,
              created_on: quoteData.createdOn,
            }
          };

          if (DRY_RUN) {
            console.log(`    [DRY RUN] Would store quote: $${totalPrice} (${quoteData.lift?.aircraftType})`);
            quotesStored++;
            continue;
          }

          // Check if already exists
          const { data: existing } = await supabase
            .from('quotes')
            .select('id')
            .eq('request_id', requestId)
            .contains('metadata', { avinode_quote_id: quoteData.id });

          if (existing?.length > 0) {
            console.log(`    Quote ${quoteData.id} already exists`);
            continue;
          }

          const { error } = await supabase.from('quotes').insert(quoteRecord);
          if (error) {
            console.error(`    Error storing quote:`, error);
          } else {
            console.log(`    Stored quote: $${totalPrice} (${quoteData.lift?.aircraftType})`);
            quotesStored++;
          }
        } catch (e) {
          console.log(`    Error fetching quote ${quoteRef.id}: ${e.message}`);
        }
      }
    }
  }

  return quotesStored;
}

/**
 * Fetch and store operator messages for a trip
 */
async function fetchAndStoreMessages(requestId, tripData, tripId) {
  const messageRefs = tripData?.tripPayload?.links?.tripmsgs || [];
  if (messageRefs.length === 0) return 0;

  let messagesStored = 0;

  for (const msgRef of messageRefs) {
    try {
      const msgResponse = await avinode.get(`/tripmsgs/${msgRef.id}`);
      const msgData = msgResponse.data?.data ?? msgResponse.data;

      if (!msgData || !msgData.sellerQuote) continue;

      // Ensure operator profile exists
      const operatorData = msgData.sellerCompany;
      if (!operatorData?.id) continue;

      // Check if operator exists
      let operatorProfileId = null;
      const { data: existingOp } = await supabase
        .from('operator_profiles')
        .select('id')
        .eq('avinode_operator_id', operatorData.id)
        .single();

      if (existingOp) {
        operatorProfileId = existingOp.id;
      } else if (!DRY_RUN) {
        // Create operator profile
        const { data: newOp, error: opError } = await supabase
          .from('operator_profiles')
          .insert({
            avinode_operator_id: operatorData.id,
            avinode_company_id: operatorData.id,
            company_name: operatorData.displayName || 'Unknown Operator',
            contact_email: operatorData.contactInfo?.emails?.[0],
            contact_phone: operatorData.contactInfo?.phone,
            is_active: operatorData.active ?? true,
          })
          .select('id')
          .single();

        if (!opError && newOp) {
          operatorProfileId = newOp.id;
          console.log(`    Created operator profile: ${operatorData.displayName}`);
        }
      }

      const messageRecord = {
        request_id: requestId,
        sender_type: 'operator',
        sender_operator_id: operatorProfileId,
        sender_name: operatorData.displayName || 'Operator',
        content: msgData.message || 'Quote received',
        content_type: 'text',
        status: 'delivered',
        metadata: {
          avinode_message_id: msgData.id,
          avinode_trip_id: tripId,
          seller_company: operatorData.displayName,
          seller_company_id: operatorData.id,
          quote_price: msgData.sellerQuote?.sellerPrice?.price,
        },
        created_at: msgData.createdOn || new Date().toISOString(),
      };

      if (DRY_RUN) {
        console.log(`    [DRY RUN] Would store message from ${operatorData.displayName}`);
        messagesStored++;
        continue;
      }

      // Check if already exists
      const { data: existingMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('request_id', requestId)
        .contains('metadata', { avinode_message_id: msgData.id });

      if (existingMsg?.length > 0) {
        console.log(`    Message ${msgData.id} already exists`);
        continue;
      }

      const { error } = await supabase.from('messages').insert(messageRecord);
      if (error) {
        console.error(`    Error storing message:`, error);
      } else {
        console.log(`    Stored message from ${operatorData.displayName}`);
        messagesStored++;
      }
    } catch (e) {
      console.log(`    Error fetching message ${msgRef.id}: ${e.message}`);
    }
  }

  return messagesStored;
}

/**
 * Main function
 */
async function main() {
  console.log('==============================================');
  console.log('   RESET AVINODE TRIPS DATABASE SCRIPT');
  console.log('==============================================');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will modify database)'}`);
  console.log(`Avinode API: ${AVINODE_BASE_URL}`);
  console.log(`Trips to add: ${NEW_TRIP_IDS.length}`);
  console.log('');

  if (!API_TOKEN || !AUTH_TOKEN) {
    console.error('ERROR: Missing Avinode API credentials.');
    console.error('Set API_TOKEN and AUTHENTICATION_TOKEN in .env.local');
    process.exit(1);
  }

  // Get default ISO agent
  let isoAgentId;
  try {
    isoAgentId = await getDefaultIsoAgentId();
    console.log(`Using ISO Agent: ${isoAgentId.substring(0, 8)}...`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  // Step 1: Purge existing data
  const purgeResult = await purgeExistingTripData();

  // Step 2: Process each new trip
  console.log('\n=== ADDING NEW TRIPS ===\n');

  let requestsCreated = 0;
  let messagesCreated = 0;
  let quotesStored = 0;
  let operatorMessagesStored = 0;
  let errors = 0;

  for (const tripId of NEW_TRIP_IDS) {
    console.log(`\n--- Processing Trip: ${tripId} ---`);

    // Fetch trip data from Avinode
    const tripData = await fetchTripFromAvinode(tripId);

    // Create request record
    const request = await createRequestForTrip(tripId, tripData, isoAgentId);
    if (!request) {
      errors++;
      continue;
    }
    requestsCreated++;

    // Create initial message
    const message = await createInitialMessage(
      request.id,
      isoAgentId,
      tripId,
      request.routeInfo,
      request.quoteCount,
      request.rfqCount
    );
    if (message) messagesCreated++;

    // Fetch and store quotes
    if (tripData) {
      const quotes = await fetchAndStoreQuotes(request.id, tripData, tripId);
      quotesStored += quotes;

      // Fetch and store operator messages
      const opMsgs = await fetchAndStoreMessages(request.id, tripData, tripId);
      operatorMessagesStored += opMsgs;

      // Update request with final counts
      if (!DRY_RUN && (quotes > 0 || opMsgs > 0)) {
        await supabase
          .from('requests')
          .update({
            quotes_received: quotes,
            message_count: 1 + opMsgs,
            session_status: quotes > 0 ? 'quotes_received' : 'active',
          })
          .eq('id', request.id);
      }
    }
  }

  // Summary
  console.log('\n==============================================');
  console.log('                  SUMMARY');
  console.log('==============================================');
  console.log(`Requests created:        ${requestsCreated}`);
  console.log(`Initial messages:        ${messagesCreated}`);
  console.log(`Quotes stored:           ${quotesStored}`);
  console.log(`Operator messages:       ${operatorMessagesStored}`);
  console.log(`Errors:                  ${errors}`);

  if (DRY_RUN) {
    console.log('\nThis was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('\nDatabase has been updated successfully!');
  }
}

// Run
main().catch(console.error);
