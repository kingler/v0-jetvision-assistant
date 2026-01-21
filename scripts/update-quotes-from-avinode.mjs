/**
 * Update Quotes from Avinode API
 *
 * This script fetches quote and message data from Avinode API and stores it in the database.
 *
 * Usage: node scripts/update-quotes-from-avinode.mjs [--dry-run] [tripId]
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
const SPECIFIC_TRIP = process.argv.find(arg => !arg.startsWith('-') && !arg.includes('/'));

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
 * Fetch trip details with RFQs and quotes from Avinode
 */
async function fetchTripData(tripId) {
  try {
    const response = await avinode.get(`/trips/${tripId}`, {
      params: { quotedetails: true }
    });
    return response.data?.data ?? response.data;
  } catch (error) {
    console.log(`  Error fetching trip ${tripId}: ${error.response?.status || error.message}`);
    return null;
  }
}

/**
 * Fetch quote details from Avinode
 */
async function fetchQuoteDetails(quoteId) {
  try {
    const response = await avinode.get(`/quotes/${quoteId}`);
    return response.data?.data ?? response.data;
  } catch (error) {
    console.log(`  Error fetching quote ${quoteId}: ${error.response?.status || error.message}`);
    return null;
  }
}

/**
 * Fetch message details from Avinode
 */
async function fetchMessageDetails(messageId) {
  try {
    const response = await avinode.get(`/tripmsgs/${messageId}`);
    return response.data?.data ?? response.data;
  } catch (error) {
    console.log(`  Error fetching message ${messageId}: ${error.response?.status || error.message}`);
    return null;
  }
}

/**
 * Store quote in database
 */
async function storeQuote(requestId, quoteData, tripId) {
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
    valid_until: null,
    metadata: {
      avinode_quote_id: quoteData.id,
      avinode_trip_id: tripId,
      aircraft_category: quoteData.lift?.aircraftCategory,
      currency: quoteData.sellerPrice?.currency || 'USD',
      seller_message: quoteData.sellerMessage,
      block_minutes: quoteData.segments?.[0]?.blockMinutes,
      flight_minutes: quoteData.segments?.[0]?.flightMinutes,
      distance_nm: quoteData.segments?.[0]?.distanceNM,
      avinode_generated: quoteData.avinodeGenerated,
      seller_company_id: quoteData.sellerCompany?.id,
      created_on: quoteData.createdOn,
    }
  };

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would store quote: ${quoteData.id} - $${quoteData.sellerPrice?.price} (${quoteData.lift?.aircraftType})`);
    return null;
  }

  // Check if quote already exists by metadata
  const { data: existing } = await supabase
    .from('quotes')
    .select('id')
    .eq('request_id', requestId)
    .contains('metadata', { avinode_quote_id: quoteData.id });

  if (existing?.length > 0) {
    console.log(`  Quote ${quoteData.id} already exists, updating...`);
    const { error } = await supabase
      .from('quotes')
      .update(quoteRecord)
      .eq('id', existing[0].id);
    if (error) throw error;
    return existing[0].id;
  }

  const { data, error } = await supabase
    .from('quotes')
    .insert(quoteRecord)
    .select('id')
    .single();

  if (error) throw error;
  console.log(`  ✓ Stored quote: ${quoteData.id} - $${quoteData.sellerPrice?.price} (${quoteData.lift?.aircraftType})`);
  return data.id;
}

/**
 * Ensure operator profile exists
 */
async function ensureOperatorProfile(operatorData) {
  const operatorId = operatorData?.id;
  if (!operatorId) return null;

  // Check if operator exists by avinode_operator_id
  const { data: existing } = await supabase
    .from('operator_profiles')
    .select('id')
    .eq('avinode_operator_id', operatorId)
    .single();

  if (existing) return existing.id;

  // Create operator profile
  const { data, error } = await supabase
    .from('operator_profiles')
    .insert({
      avinode_operator_id: operatorId,  // Required, unique
      avinode_company_id: operatorId,   // Also store as company ID
      company_name: operatorData.displayName || 'Unknown Operator',
      contact_email: operatorData.contactInfo?.emails?.[0],
      contact_phone: operatorData.contactInfo?.phone,
      is_active: operatorData.active ?? true,
      metadata: {
        contact_info: operatorData.contactInfo,
        company_address: operatorData.contactInfo?.address,
      }
    })
    .select('id')
    .single();

  if (error) {
    console.log(`  Warning: Could not create operator profile: ${error.message}`);
    return null;
  }

  console.log(`  ✓ Created operator profile: ${operatorData.displayName}`);
  return data.id;
}

/**
 * Store operator message in database
 */
async function storeMessage(requestId, messageData, quoteId, tripId, operatorProfileId) {
  const messageRecord = {
    request_id: requestId,
    quote_id: quoteId,
    sender_type: 'operator',
    sender_operator_id: operatorProfileId, // Required for valid_sender constraint
    sender_name: messageData.sellerCompany?.displayName || 'Operator',
    content: messageData.message || 'Quote received',
    content_type: 'text',
    status: 'delivered', // Valid enum: sending, sent, delivered, read, failed
    metadata: {
      avinode_message_id: messageData.id,
      avinode_trip_id: tripId,
      seller_company: messageData.sellerCompany?.displayName,
      seller_company_id: messageData.sellerCompany?.id,
      seller_account: messageData.sellerAccount?.displayName,
      rfq_accepted: messageData.rfqAccepted,
      quote_price: messageData.sellerQuote?.sellerPrice?.price,
      aircraft_type: messageData.lift?.[0]?.aircraftType,
    },
    created_at: messageData.createdOn || new Date().toISOString(),
  };

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would store message from ${messageData.sellerCompany?.displayName}`);
    return null;
  }

  // Check if message already exists by metadata
  const { data: existing } = await supabase
    .from('messages')
    .select('id')
    .eq('request_id', requestId)
    .contains('metadata', { avinode_message_id: messageData.id });

  if (existing?.length > 0) {
    console.log(`  Message ${messageData.id} already exists, skipping...`);
    return existing[0].id;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(messageRecord)
    .select('id')
    .single();

  if (error) throw error;
  console.log(`  ✓ Stored message from ${messageData.sellerCompany?.displayName}`);
  return data.id;
}

/**
 * Main function
 */
async function main() {
  console.log('=== Update Quotes from Avinode API ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
  console.log(`Avinode API: ${AVINODE_BASE_URL}\n`);

  if (!API_TOKEN || !AUTH_TOKEN) {
    console.error('ERROR: Missing Avinode API credentials');
    return;
  }

  // Get requests with trip IDs
  let query = supabase
    .from('requests')
    .select('id, avinode_trip_id, avinode_rfq_id, departure_airport, arrival_airport')
    .not('avinode_trip_id', 'is', null);

  if (SPECIFIC_TRIP) {
    query = query.eq('avinode_trip_id', SPECIFIC_TRIP);
  }

  const { data: requests, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching requests:', error);
    return;
  }

  // Get unique trip IDs to avoid duplicate API calls
  const uniqueTrips = [...new Set(requests.map(r => r.avinode_trip_id))];
  console.log(`Found ${requests.length} requests with ${uniqueTrips.length} unique trip IDs\n`);

  let quotesStored = 0;
  let messagesStored = 0;
  let errors = 0;

  for (const tripId of uniqueTrips) {
    console.log(`\n--- Processing Trip: ${tripId} ---`);

    // Find the first request for this trip (to link quotes)
    const request = requests.find(r => r.avinode_trip_id === tripId);
    if (!request) continue;

    // Fetch trip data
    const tripData = await fetchTripData(tripId);
    if (!tripData || !tripData.rfqs || tripData.rfqs.length === 0) {
      console.log(`  No RFQs found for trip ${tripId}`);
      continue;
    }

    console.log(`  Found ${tripData.rfqs.length} RFQ(s)`);

    // Process each RFQ
    for (const rfq of tripData.rfqs) {
      console.log(`  RFQ: ${rfq.id}`);

      // Get quotes from sellerLift
      const sellerLifts = rfq.sellerLift || [];
      for (const lift of sellerLifts) {
        const quotes = lift.links?.quotes || [];
        for (const quoteRef of quotes) {
          try {
            const quoteData = await fetchQuoteDetails(quoteRef.id);
            if (quoteData) {
              await storeQuote(request.id, quoteData, tripId);
              quotesStored++;
            }
          } catch (e) {
            console.log(`  Error storing quote ${quoteRef.id}: ${e.message}`);
            errors++;
          }
        }
      }
    }

    // Process trip messages
    const messageRefs = tripData.links?.tripmsgs || [];
    console.log(`  Found ${messageRefs.length} message(s)`);

    for (const msgRef of messageRefs) {
      try {
        const msgData = await fetchMessageDetails(msgRef.id);
        if (msgData && msgData.sellerQuote) {
          // Ensure operator profile exists
          const operatorProfileId = await ensureOperatorProfile(msgData.sellerCompany);
          if (!operatorProfileId) {
            console.log(`  Skipping message ${msgRef.id} - no operator profile`);
            continue;
          }

          // Link to quote if available (search by metadata)
          const avinodeQuoteId = msgData.sellerQuote.id;
          const { data: quoteRecords } = await supabase
            .from('quotes')
            .select('id')
            .eq('request_id', request.id)
            .contains('metadata', { avinode_quote_id: avinodeQuoteId });

          await storeMessage(request.id, msgData, quoteRecords?.[0]?.id, tripId, operatorProfileId);
          messagesStored++;
        }
      } catch (e) {
        console.log(`  Error storing message ${msgRef.id}: ${e.message}`);
        errors++;
      }
    }

    // Update request with quote count
    if (!DRY_RUN) {
      const { count } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('request_id', request.id);

      await supabase
        .from('requests')
        .update({
          quotes_received: count || 0,
          session_status: count > 0 ? 'quotes_received' : undefined,
        })
        .eq('id', request.id);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Quotes stored: ${quotesStored}`);
  console.log(`Messages stored: ${messagesStored}`);
  console.log(`Errors: ${errors}`);

  if (DRY_RUN) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  }
}

main().catch(console.error);
