/**
 * Backfill Trip Details from Avinode
 *
 * This script:
 * 1. Finds all requests with tripIds that are missing route info or initial messages
 * 2. Fetches trip details from Avinode API
 * 3. Updates request records with route info
 * 4. Creates a reverse-engineered initial request message based on flight details
 *
 * Usage: node scripts/backfill-trip-details.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load env vars
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Fetch trip details from Avinode via the chat API
 */
async function fetchTripDetailsFromAvinode(tripId) {
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `get_rfq ${tripId}`,
        skipMessagePersistence: true, // Don't save this lookup as a message
      }),
    });

    if (!response.ok) {
      console.error(`  API error for ${tripId}: ${response.status}`);
      return null;
    }

    // Parse SSE stream to extract data
    const text = await response.text();
    const lines = text.split('\n');

    let tripData = null;
    let rfqData = null;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      try {
        const data = JSON.parse(line.slice(6));

        if (data.trip_data) {
          tripData = data.trip_data;
        }
        if (data.rfp_data) {
          tripData = data.rfp_data;
        }
        if (data.rfq_data) {
          rfqData = data.rfq_data;
        }

        // Also check tool_calls for trip data
        if (data.tool_calls) {
          for (const toolCall of data.tool_calls) {
            if (toolCall.name === 'get_rfq' && toolCall.result) {
              const result = toolCall.result;
              if (!tripData) {
                tripData = {
                  trip_id: result.trip_id || tripId,
                  departure_airport: result.departure_airport || result.route?.departure?.airport,
                  arrival_airport: result.arrival_airport || result.route?.arrival?.airport,
                  departure_date: result.departure_date || result.route?.departure?.date,
                  passengers: result.passengers,
                  deep_link: result.deep_link,
                };
              }
              if (result.rfqs) {
                rfqData = { rfqs: result.rfqs, quotes: result.quotes };
              }
            }
          }
        }
      } catch (e) {
        // Ignore parse errors for non-JSON lines
      }
    }

    return { tripData, rfqData };
  } catch (error) {
    console.error(`  Error fetching trip ${tripId}:`, error.message);
    return null;
  }
}

/**
 * Generate a natural language initial request message from trip details
 */
function generateInitialRequestMessage(tripData, rfqData) {
  const departure = tripData?.departure_airport;
  const arrival = tripData?.arrival_airport;
  const date = tripData?.departure_date;
  const passengers = tripData?.passengers;

  // Extract airport codes
  const depCode = typeof departure === 'object' ? departure.icao : departure;
  const arrCode = typeof arrival === 'object' ? arrival.icao : arrival;
  const depName = typeof departure === 'object' ? departure.name : null;
  const arrName = typeof arrival === 'object' ? arrival.name : null;

  // Format date nicely
  let formattedDate = date;
  if (date) {
    try {
      const d = new Date(date);
      formattedDate = d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      // Keep original format
    }
  }

  // Build the message
  const parts = ['I need a charter flight'];

  if (depCode && arrCode) {
    const depStr = depName ? `${depCode} (${depName})` : depCode;
    const arrStr = arrName ? `${arrCode} (${arrName})` : arrCode;
    parts.push(`from ${depStr} to ${arrStr}`);
  }

  if (passengers) {
    parts.push(`for ${passengers} passenger${passengers > 1 ? 's' : ''}`);
  }

  if (formattedDate) {
    parts.push(`on ${formattedDate}`);
  }

  // Add quote info if available
  const quoteCount = rfqData?.quotes?.length || 0;
  const rfqCount = rfqData?.rfqs?.length || 0;

  if (quoteCount > 0 || rfqCount > 0) {
    parts.push(`[Trip ${tripData.trip_id}: ${quoteCount} quotes received from ${rfqCount} operators]`);
  } else {
    parts.push(`[Trip ID: ${tripData.trip_id}]`);
  }

  return parts.join(' ') + '.';
}

/**
 * Main backfill function
 */
async function backfillTripDetails() {
  console.log('=== Backfill Trip Details from Avinode ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}\n`);

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
    const result = await fetchTripDetailsFromAvinode(req.avinode_trip_id);

    if (!result || !result.tripData) {
      console.log('  ✗ Could not fetch trip details');
      errors++;
      continue;
    }

    const { tripData, rfqData } = result;
    console.log(`  Got: ${JSON.stringify({
      departure: tripData.departure_airport,
      arrival: tripData.arrival_airport,
      date: tripData.departure_date,
      passengers: tripData.passengers,
    })}`);

    // Extract data for update
    const depAirport = typeof tripData.departure_airport === 'object'
      ? tripData.departure_airport.icao
      : tripData.departure_airport;
    const arrAirport = typeof tripData.arrival_airport === 'object'
      ? tripData.arrival_airport.icao
      : tripData.arrival_airport;

    if (DRY_RUN) {
      console.log('  [DRY RUN] Would update request with:');
      console.log(`    departure_airport: ${depAirport}`);
      console.log(`    arrival_airport: ${arrAirport}`);
      console.log(`    departure_date: ${tripData.departure_date}`);
      console.log(`    passengers: ${tripData.passengers}`);

      if (!hasInitialMessage) {
        const msg = generateInitialRequestMessage(tripData, rfqData);
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
        const messageContent = generateInitialRequestMessage(tripData, rfqData);

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
