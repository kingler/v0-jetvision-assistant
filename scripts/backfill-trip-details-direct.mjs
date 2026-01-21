/**
 * Backfill Trip Details from Avinode - Direct API Version
 *
 * This script directly calls the Avinode API without needing the dev server.
 * It fetches trip details and creates reverse-engineered initial request messages.
 *
 * Usage: node scripts/backfill-trip-details-direct.mjs [--dry-run]
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

// Add request interceptor to set timestamp on each request (required by Avinode API)
avinode.interceptors.request.use((config) => {
  config.headers['X-Avinode-SentTimestamp'] = new Date().toISOString();
  return config;
});

/**
 * Fetch trip details from Avinode API
 * Uses GET /trips/{tripId} which returns trip data including RFQs
 */
async function fetchTripFromAvinode(tripId) {
  try {
    // Get trip info via the trips endpoint
    const response = await avinode.get(`/trips/${tripId}`, {
      params: {
        taildetails: true,
        quotedetails: true,
      }
    });

    // Handle Avinode's response structure
    const tripPayload = response.data?.data ?? response.data;

    if (!tripPayload) {
      console.log(`  No trip data returned for ${tripId}`);
      return null;
    }

    // The trip endpoint gives us RFQ references - we need to fetch RFQ details for route info
    const rfqRefs = tripPayload.rfqs || [];

    if (rfqRefs.length === 0) {
      console.log(`  No RFQs found for trip ${tripId}`);
      return null;
    }

    // Get the first RFQ details (contains route segments)
    const firstRfqRef = rfqRefs[0];
    const rfqId = firstRfqRef.id;

    console.log(`  Fetching RFQ details: ${rfqId}`);
    const rfqResponse = await avinode.get(`/rfqs/${rfqId}`, {
      params: {
        taildetails: true,
        quotedetails: true,
      }
    });

    const rfqData = rfqResponse.data?.data ?? rfqResponse.data;

    if (!rfqData) {
      console.log(`  No RFQ data returned for ${rfqId}`);
      return null;
    }

    // Extract route info from RFQ legs/segments
    const legs = rfqData.legs || [];
    const segments = rfqData.segments || legs;

    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1] || firstSegment;

    // Avinode segment structure (discovered from API):
    // {
    //   startAirport: { icao: "KEWR", iata: "EWR", ... },
    //   endAirport: { icao: "KMIA", iata: "MIA", ... },
    //   dateTime: { date: "2026-03-01", time: "09:00", ... },
    //   paxCount: "5"
    // }
    const depAirport = firstSegment?.startAirport?.icao ||
                       firstSegment?.startAirport?.iata ||
                       firstSegment?.departureAirport?.icao ||
                       firstSegment?.departure?.airport;
    const arrAirport = lastSegment?.endAirport?.icao ||
                       lastSegment?.endAirport?.iata ||
                       lastSegment?.arrivalAirport?.icao ||
                       lastSegment?.arrival?.airport ||
                       firstSegment?.endAirport?.icao;

    // Get date from dateTime object
    const depDate = firstSegment?.dateTime?.date ||
                    firstSegment?.departureDate ||
                    firstSegment?.departure?.date;

    // Get passengers - paxCount is a string
    const paxCount = firstSegment?.paxCount || rfqData.pax || rfqData.passengers || tripPayload.pax;
    const passengers = paxCount ? parseInt(paxCount, 10) : undefined;

    // Build deep link from trip actions
    const deepLink = tripPayload.actions?.viewInAvinode?.href ||
                     tripPayload.actions?.searchInAvinode?.href ||
                     `https://sandbox.avinode.com/marketplace/mvc/trips/buying/${tripPayload.id}`;

    // Extract quotes from RFQ
    const quotes = rfqData.quotes || [];

    return {
      tripId,
      departure_airport: depAirport,
      arrival_airport: arrAirport,
      departure_date: depDate,
      passengers: passengers,
      deep_link: deepLink,
      rfqs: rfqRefs,
      quotes,
    };
  } catch (error) {
    const status = error.response?.status;
    const errorData = error.response?.data;

    if (status === 404) {
      console.log(`  Trip ${tripId} not found in Avinode (may have expired)`);
    } else if (status === 400) {
      // Log detailed 400 error
      const errMsg = errorData?.meta?.errors?.[0]?.title ||
        errorData?.message ||
        error.message;
      console.log(`  Bad request for trip ${tripId}: ${errMsg}`);

      // Try the /rfqs endpoint as fallback
      try {
        console.log(`  Trying fallback: GET /rfqs/${tripId}`);
        const rfqResponse = await avinode.get(`/rfqs/${tripId}`, {
          params: { taildetails: true, quotedetails: true }
        });
        const rfqData = rfqResponse.data?.data ?? rfqResponse.data;

        if (rfqData) {
          // Extract from RFQ response structure
          const segments = rfqData.segments || rfqData.route?.segments || [];
          const firstSeg = segments[0];
          const lastSeg = segments[segments.length - 1] || firstSeg;

          return {
            tripId,
            departure_airport: firstSeg?.departure?.airport,
            arrival_airport: lastSeg?.arrival?.airport || firstSeg?.arrival?.airport,
            departure_date: firstSeg?.departure?.date,
            passengers: rfqData.pax,
            deep_link: `https://sandbox.avinode.com/marketplace/mvc/trips/${tripId}`,
            rfqs: Array.isArray(rfqData) ? rfqData : [rfqData],
            quotes: rfqData.quotes || [],
          };
        }
      } catch (fallbackError) {
        console.log(`  Fallback also failed: ${fallbackError.response?.status || fallbackError.message}`);
      }
    } else {
      console.log(`  Error fetching trip ${tripId}: ${status || ''} ${error.message}`);
    }
    return null;
  }
}

/**
 * Format airport for display
 */
function formatAirport(airport) {
  if (!airport) return null;
  if (typeof airport === 'string') return airport;
  return airport.icao || airport.iata || airport.code || airport.name;
}

/**
 * Generate a natural language initial request message from trip details
 */
function generateInitialRequestMessage(tripData) {
  const depCode = formatAirport(tripData.departure_airport);
  const arrCode = formatAirport(tripData.arrival_airport);
  const date = tripData.departure_date;
  const passengers = tripData.passengers;
  const quoteCount = tripData.quotes?.length || 0;
  const rfqCount = tripData.rfqs?.length || 0;

  // Format date nicely - parse as local time to avoid timezone shifts
  let formattedDate = date;
  if (date) {
    try {
      // Parse YYYY-MM-DD as local date (not UTC)
      const [year, month, day] = date.split('-').map(Number);
      const d = new Date(year, month - 1, day); // month is 0-indexed
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
  }

  // Build the message
  const parts = ['I need a charter flight'];

  if (depCode && arrCode) {
    parts.push(`from ${depCode} to ${arrCode}`);
  }

  if (passengers) {
    parts.push(`for ${passengers} passenger${passengers > 1 ? 's' : ''}`);
  }

  if (formattedDate) {
    parts.push(`on ${formattedDate}`);
  }

  // Add trip info
  const infoStr = quoteCount > 0
    ? `[Trip ${tripData.tripId}: ${quoteCount} quotes from ${rfqCount} operators]`
    : `[Trip ID: ${tripData.tripId}]`;
  parts.push(infoStr);

  return parts.join(' ') + '.';
}

/**
 * Main backfill function
 */
async function backfillTripDetails() {
  console.log('=== Backfill Trip Details from Avinode (Direct API) ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
  console.log(`Avinode API: ${AVINODE_BASE_URL}\n`);

  if (!API_TOKEN || !AUTH_TOKEN) {
    console.error('ERROR: Missing Avinode API credentials. Set API_TOKEN and AUTHENTICATION_TOKEN in .env.local');
    return;
  }

  // Find requests with tripIds that need backfilling
  const { data: requests, error } = await supabase
    .from('requests')
    .select(`
      id,
      iso_agent_id,
      avinode_trip_id,
      avinode_rfq_id,
      departure_airport,
      arrival_airport,
      departure_date,
      passengers,
      status,
      session_status,
      message_count,
      created_at
    `)
    .not('avinode_trip_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching requests:', error);
    return;
  }

  console.log(`Found ${requests.length} requests with trip IDs\n`);

  let updated = 0;
  let messagesCreated = 0;
  let skipped = 0;
  let errors = 0;

  for (const req of requests) {
    console.log(`\nProcessing: ${req.avinode_trip_id} (Request: ${req.id.substring(0, 8)}...)`);

    // Check if this request already has a proper initial message
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id, content, sender_type')
      .eq('request_id', req.id)
      .eq('sender_type', 'iso_agent')
      .order('created_at', { ascending: true })
      .limit(1);

    const hasInitialMessage = existingMessages?.length > 0 &&
      !existingMessages[0].content.startsWith('get_rfq');

    const needsRouteInfo = !req.departure_airport || !req.arrival_airport;

    if (!needsRouteInfo && hasInitialMessage) {
      console.log('  ✓ Already has route info and initial message - skipping');
      skipped++;
      continue;
    }

    // Fetch trip details from Avinode
    console.log('  Fetching from Avinode API...');
    const tripData = await fetchTripFromAvinode(req.avinode_trip_id);

    if (!tripData) {
      console.log('  ✗ Could not fetch trip details');
      errors++;
      continue;
    }

    const depAirport = formatAirport(tripData.departure_airport);
    const arrAirport = formatAirport(tripData.arrival_airport);

    console.log(`  Got: departure=${depAirport}, arrival=${arrAirport}, date=${tripData.departure_date}, pax=${tripData.passengers}`);

    if (DRY_RUN) {
      if (needsRouteInfo) {
        console.log('  [DRY RUN] Would update request with:');
        console.log(`    departure_airport: ${depAirport}`);
        console.log(`    arrival_airport: ${arrAirport}`);
        console.log(`    departure_date: ${tripData.departure_date}`);
        console.log(`    passengers: ${tripData.passengers}`);
      }

      if (!hasInitialMessage) {
        const msg = generateInitialRequestMessage(tripData);
        console.log(`  [DRY RUN] Would create initial message: "${msg}"`);
      }
    } else {
      // Update request with route info
      if (needsRouteInfo && depAirport && arrAirport) {
        const { error: updateError } = await supabase
          .from('requests')
          .update({
            departure_airport: depAirport,
            arrival_airport: arrAirport,
            departure_date: tripData.departure_date || req.departure_date,
            passengers: tripData.passengers || req.passengers,
            avinode_deep_link: tripData.deep_link,
          })
          .eq('id', req.id);

        if (updateError) {
          console.log(`  ✗ Error updating request: ${updateError.message}`);
          errors++;
          continue;
        }
        console.log('  ✓ Updated request with route info');
        updated++;
      }

      // Create initial message if missing
      if (!hasInitialMessage) {
        const messageContent = generateInitialRequestMessage(tripData);

        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            request_id: req.id,
            sender_type: 'iso_agent',
            sender_iso_agent_id: req.iso_agent_id,
            content: messageContent,
            content_type: 'text',
            status: 'sent',
            metadata: {
              backfilled: true,
              original_trip_id: req.avinode_trip_id,
              backfill_date: new Date().toISOString(),
            },
            // Set created_at to match the request creation time
            created_at: req.created_at,
          });

        if (msgError) {
          console.log(`  ✗ Error creating message: ${msgError.message}`);
          errors++;
          continue;
        }
        console.log(`  ✓ Created initial message: "${messageContent.substring(0, 60)}..."`);
        messagesCreated++;

        // Update message count
        await supabase
          .from('requests')
          .update({ message_count: (req.message_count || 0) + 1 })
          .eq('id', req.id);
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Requests updated: ${updated}`);
  console.log(`Messages created: ${messagesCreated}`);
  console.log(`Skipped (already complete): ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (DRY_RUN) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  }
}

// Run the backfill
backfillTripDetails().catch(console.error);
