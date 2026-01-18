#!/usr/bin/env npx tsx
/**
 * Avinode Trip Sync Script
 *
 * Syncs trip details, RFQs, quotes, and messages from Avinode API
 * to the local Supabase database for specified Trip IDs.
 *
 * Features:
 * - Fetches trip details from Avinode API
 * - Retrieves RFQ information and operator quotes
 * - Syncs conversation messages between user and operators
 * - Creates or updates requests, quotes, and messages in Supabase
 * - Links all data to the authenticated user's sessions
 *
 * Usage:
 *   npx tsx scripts/database/sync-avinode-trips.ts [options] <trip-ids>
 *
 * Examples:
 *   npx tsx scripts/database/sync-avinode-trips.ts A648J4 DEFA55 4ND3C3
 *   npx tsx scripts/database/sync-avinode-trips.ts --user-id <uuid> A648J4
 *   npx tsx scripts/database/sync-avinode-trips.ts --dry-run A648J4
 *
 * Options:
 *   --dry-run        Preview changes without applying them
 *   --user-id <id>   Associate trips with specific ISO agent UUID
 *   --verbose        Show detailed logging
 *   --skip-messages  Skip syncing messages
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from project root
config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Avinode API configuration (same as MCP server)
const avinodeBaseUrl = process.env.BASE_URI || process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';
const avinodeApiToken = process.env.API_TOKEN || process.env.AVINODE_API_TOKEN;
const avinodeAuthToken = (process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN || '').replace(/^bearer\s+/i, '');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const hasAvinodeAuth = !!(avinodeApiToken && avinodeAuthToken);
if (!hasAvinodeAuth) {
  console.error('❌ Avinode API credentials not configured.');
  console.error('   Set API_TOKEN and AUTHENTICATION_TOKEN in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const SKIP_MESSAGES = args.includes('--skip-messages');

// Get user ID from args
const userIdIndex = args.indexOf('--user-id');
const USER_ID = userIdIndex !== -1 ? args[userIdIndex + 1] : null;

// Get Trip IDs (remaining args that don't start with --)
const TRIP_IDS = args.filter(arg => !arg.startsWith('--') && arg !== USER_ID);

if (TRIP_IDS.length === 0) {
  console.log(`
Usage: npx tsx scripts/database/sync-avinode-trips.ts [options] <trip-ids>

Options:
  --dry-run        Preview changes without applying them
  --user-id <id>   Associate trips with specific ISO agent UUID
  --verbose        Show detailed logging
  --skip-messages  Skip syncing messages

Examples:
  npx tsx scripts/database/sync-avinode-trips.ts A648J4 DEFA55 4ND3C3
  npx tsx scripts/database/sync-avinode-trips.ts --user-id abc-123 A648J4
  `);
  process.exit(1);
}

// Types
interface AvinodeTrip {
  id: string;
  tripId: string;
  status: string;
  departureAirport: { icao: string; name?: string };
  arrivalAirport: { icao: string; name?: string };
  departureDate: string;
  passengers: number;
  aircraftType?: string;
  deepLink?: string;
  createdAt: string;
  updatedAt: string;
}

interface AvinodeRFQ {
  id: string;
  tripId: string;
  operatorId: string;
  operatorName: string;
  status: string;
  price?: number;
  currency?: string;
  aircraftType?: string;
  sentAt: string;
  responseAt?: string;
}

interface AvinodeMessage {
  id: string;
  tripId: string;
  operatorId?: string;
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: string;
  senderName?: string;
}

interface SyncReport {
  timestamp: string;
  dryRun: boolean;
  tripIds: string[];
  tripsProcessed: number;
  tripsCreated: number;
  tripsUpdated: number;
  quotesCreated: number;
  messagesCreated: number;
  errors: string[];
  details: Array<{
    tripId: string;
    status: 'created' | 'updated' | 'skipped' | 'error';
    requestId?: string;
    quotes?: number;
    messages?: number;
    error?: string;
  }>;
}

// Verbose logging helper
function logVerbose(...args: any[]): void {
  if (VERBOSE) {
    console.log(...args);
  }
}

// Helper to make authenticated Avinode API requests
async function avinodeRequest(endpoint: string): Promise<any> {
  const response = await fetch(`${avinodeBaseUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Avinode-ApiToken': avinodeApiToken!,
      'Authorization': `Bearer ${avinodeAuthToken}`,
      'X-Avinode-ApiVersion': 'v1.0',
      'X-Avinode-SentTimestamp': new Date().toISOString(),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text.substring(0, 200)}`);
  }

  return response.json();
}

async function fetchTripFromAvinode(tripId: string): Promise<AvinodeTrip | null> {
  try {
    // Use /rfqs/{tripId} endpoint which returns trip details in RFQ response
    // This is the same endpoint we use to get RFQs, but we extract trip info from it
    const response = await avinodeRequest(`/rfqs/${tripId}?taildetails=true&typedetails=true&timestamps=true`);

    // Response structure: { meta: {...}, data: [...RFQs] }
    const rfqArray = response.data || [];

    if (rfqArray.length === 0) {
      console.warn(`  No RFQs found for trip ${tripId}`);
      return null;
    }

    // Extract trip info from the first RFQ
    const firstRfq = rfqArray[0];
    const segments = firstRfq.segments || [];
    const firstSegment = segments[0] || {};
    const lastSegment = segments[segments.length - 1] || firstSegment;

    // Get deep link from RFQ actions
    const deepLink = firstRfq.actions?.viewInAvinode?.href ||
                    `https://sandbox.avinode.com/marketplace/trips/${tripId}`;

    logVerbose(`    First RFQ ID: ${firstRfq.id}`);
    logVerbose(`    Deep Link: ${deepLink}`);

    return {
      id: firstRfq.id || tripId,
      tripId: tripId,
      status: 'active',
      departureAirport: {
        icao: firstSegment.startAirportDetails?.icao || firstSegment.startAirport?.icao || 'XXXX',
        name: firstSegment.startAirportDetails?.name || firstSegment.startAirport?.name
      },
      arrivalAirport: {
        icao: lastSegment.endAirportDetails?.icao || lastSegment.endAirport?.icao || 'XXXX',
        name: lastSegment.endAirportDetails?.name || lastSegment.endAirport?.name
      },
      departureDate: firstSegment.dateTime?.date || firstSegment.departureDateTime?.dateTimeLocal?.split('T')[0] || new Date().toISOString().split('T')[0],
      passengers: parseInt(firstSegment.paxCount) || 1,
      aircraftType: firstRfq.sellerLift?.[0]?.aircraftType,
      deepLink: deepLink,
      createdAt: firstRfq.createdOn || new Date().toISOString(),
      updatedAt: firstRfq.updatedOn || firstRfq.createdOn || new Date().toISOString(),
    };
  } catch (error) {
    console.error(`  ❌ Failed to fetch trip from Avinode: ${error}`);
    return null;
  }
}

async function fetchRFQsFromAvinode(tripId: string): Promise<AvinodeRFQ[]> {
  try {
    // Use the RFQ endpoint with trip ID to get quotes
    // API structure: GET /rfqs/{tripId} returns { meta: {...}, data: [...RFQs] }
    const response = await avinodeRequest(`/rfqs/${tripId}?taildetails=true&typedetails=true&timestamps=true&quotebreakdown=true`);

    // Response structure: { meta: {...}, data: [...RFQs] }
    const rfqArray = response.data || [];

    if (!Array.isArray(rfqArray) || rfqArray.length === 0) {
      console.warn(`  No RFQs found in API response for trip ${tripId}`);
      return [];
    }

    const rfqs: AvinodeRFQ[] = [];

    // Process each RFQ in the response
    for (const rfq of rfqArray) {
      const sellerCompany = rfq.sellerCompany || {};
      const createdOn = rfq.createdOn || new Date().toISOString();

      // Extract quotes from sellerLift array (primary source for operator quotes)
      const sellerLifts = rfq.sellerLift || [];

      for (const lift of sellerLifts) {
        const quoteLinks = lift.links?.quotes || [];
        const quoteId = quoteLinks[0]?.id || lift.id;

        rfqs.push({
          id: quoteId,
          tripId: tripId,
          operatorId: sellerCompany.id || '',
          operatorName: sellerCompany.displayName || sellerCompany.name || 'Unknown Operator',
          status: lift.sourcingDisplayStatus || 'pending',
          price: lift.sellerPrice?.price,
          currency: lift.sellerPrice?.currency || 'USD',
          aircraftType: lift.aircraftType,
          sentAt: createdOn,
          responseAt: lift.updatedOn || lift.createdOn,
        });

        logVerbose(`    Quote: ${quoteId} - ${lift.aircraftType} - ${lift.sourcingDisplayStatus}`);
      }

      // If no sellerLifts but we have an RFQ, add the RFQ itself
      if (sellerLifts.length === 0) {
        rfqs.push({
          id: rfq.id,
          tripId: tripId,
          operatorId: sellerCompany.id || '',
          operatorName: sellerCompany.displayName || 'Unknown Operator',
          status: 'pending',
          sentAt: createdOn,
        });
      }
    }

    return rfqs;
  } catch (error) {
    console.error(`  ❌ Failed to fetch RFQs from Avinode: ${error}`);
    return [];
  }
}

async function fetchMessagesFromAvinode(tripId: string): Promise<AvinodeMessage[]> {
  try {
    // First, get the RFQs to find message links
    // API structure: GET /rfqs/{tripId} returns RFQs with links.tripmsgs
    const response = await avinodeRequest(`/rfqs/${tripId}?timestamps=true`);

    // Response structure: { meta: {...}, data: [...RFQs] }
    const rfqArray = response.data || [];

    if (!Array.isArray(rfqArray) || rfqArray.length === 0) {
      console.warn(`  No RFQs (and thus no messages) found for trip ${tripId}`);
      return [];
    }

    const messages: AvinodeMessage[] = [];
    const fetchedMessageIds = new Set<string>();

    // Process each RFQ to find message links
    for (const rfq of rfqArray) {
      const tripmsgLinks = rfq.links?.tripmsgs || [];
      const sellerCompany = rfq.sellerCompany || {};
      const buyerAccount = rfq.buyerAccount || {};

      for (const msgLink of tripmsgLinks) {
        const messageId = msgLink.id;

        // Skip if already fetched (dedup)
        if (fetchedMessageIds.has(messageId)) {
          continue;
        }
        fetchedMessageIds.add(messageId);

        try {
          // Fetch individual message details
          const msgResponse = await avinodeRequest(`/tripmsgs/${messageId}`);
          const msgData = msgResponse.data || msgResponse;

          // Determine direction: buyer messages are outbound, seller messages are inbound
          const isBuyerMessage = messageId.startsWith('abuyermsg-');
          const direction: 'inbound' | 'outbound' = isBuyerMessage ? 'outbound' : 'inbound';

          const senderName = isBuyerMessage
            ? (msgData.buyerAccount?.displayName || buyerAccount.displayName || 'Broker')
            : (msgData.sellerCompany?.displayName || sellerCompany.displayName || 'Operator');

          messages.push({
            id: messageId,
            tripId: tripId,
            operatorId: sellerCompany.id || msgData.sellerCompany?.id,
            direction: direction,
            content: msgData.message || msgData.content || msgData.text || '',
            timestamp: msgData.createdOn || new Date().toISOString(),
            senderName: senderName,
          });

          logVerbose(`    Message: ${messageId} - ${direction} - "${(msgData.message || '').substring(0, 50)}..."`);
        } catch (msgError) {
          console.warn(`    Failed to fetch message ${messageId}: ${msgError}`);
        }
      }
    }

    // Sort messages by timestamp (oldest first)
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return messages;
  } catch (error) {
    console.error(`  ❌ Failed to fetch messages from Avinode: ${error}`);
    return [];
  }
}

async function getOrCreateRequest(
  tripId: string,
  tripData: AvinodeTrip,
  userId: string | null,
  dryRun: boolean
): Promise<{ id: string; created: boolean } | null> {
  // Check if request already exists with this trip ID
  const { data: existing, error: findError } = await supabase
    .from('requests')
    .select('id')
    .eq('avinode_trip_id', tripId)
    .maybeSingle();

  if (findError) {
    console.error(`  Error finding request: ${findError.message}`);
    return null;
  }

  if (existing) {
    // Update existing request
    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          departure_airport: tripData.departureAirport.icao,
          arrival_airport: tripData.arrivalAirport.icao,
          departure_date: tripData.departureDate,
          passengers: tripData.passengers,
          aircraft_type: tripData.aircraftType,
          avinode_deep_link: tripData.deepLink,
          session_status: 'active',
          conversation_type: 'flight_request',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`  Error updating request: ${updateError.message}`);
        return null;
      }
    }
    return { id: existing.id, created: false };
  }

  // Get default user if not specified
  let isoAgentId = userId;
  if (!isoAgentId) {
    const { data: agents } = await supabase
      .from('iso_agents')
      .select('id')
      .limit(1)
      .single();
    isoAgentId = agents?.id;
  }

  if (!isoAgentId) {
    console.error('  No ISO agent found to associate with request');
    return null;
  }

  if (dryRun) {
    return { id: `dry-run-${tripId}`, created: true };
  }

  // Create new request
  const { data: newRequest, error: createError } = await supabase
    .from('requests')
    .insert({
      iso_agent_id: isoAgentId,
      avinode_trip_id: tripId,
      avinode_deep_link: tripData.deepLink,
      departure_airport: tripData.departureAirport.icao,
      arrival_airport: tripData.arrivalAirport.icao,
      departure_date: tripData.departureDate,
      passengers: tripData.passengers,
      aircraft_type: tripData.aircraftType,
      status: 'pending',
      session_status: 'active',
      conversation_type: 'flight_request',
      subject: `Flight: ${tripData.departureAirport.icao} → ${tripData.arrivalAirport.icao}`,
      session_started_at: tripData.createdAt,
      last_activity_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (createError) {
    console.error(`  Error creating request: ${createError.message}`);
    return null;
  }

  return { id: newRequest.id, created: true };
}

async function syncQuotes(
  requestId: string,
  rfqs: AvinodeRFQ[],
  dryRun: boolean
): Promise<number> {
  let created = 0;

  for (const rfq of rfqs) {
    if (dryRun) {
      created++;
      continue;
    }

    // Check if quote already exists by checking metadata for avinode_quote_id
    const { data: existing } = await supabase
      .from('quotes')
      .select('id')
      .eq('request_id', requestId)
      .contains('metadata', { avinode_quote_id: rfq.id })
      .maybeSingle();

    if (existing) {
      continue; // Skip existing quotes
    }

    // Skip quotes without price (pending quotes without actual pricing)
    // The valid_base_price constraint requires base_price > 0
    const price = rfq.price;
    if (!price || price <= 0) {
      logVerbose(`    Skipping quote ${rfq.id} - no price data (pending quote)`);
      continue;
    }

    // Create quote
    // Schema: base_price, total_price, aircraft_type are required
    const { error } = await supabase
      .from('quotes')
      .insert({
        request_id: requestId,
        operator_id: rfq.operatorId || 'unknown',
        operator_name: rfq.operatorName,
        aircraft_type: rfq.aircraftType || 'Unknown',
        base_price: price,
        total_price: price,
        status: rfq.status === 'Accepted' ? 'received' : 'pending',
        valid_until: rfq.responseAt
          ? new Date(new Date(rfq.responseAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        metadata: {
          avinode_quote_id: rfq.id,
          currency: rfq.currency || 'USD',
          source: 'avinode_sync',
          sourcing_status: rfq.status,
        },
      });

    if (error) {
      console.warn(`    Error creating quote: ${error.message}`);
    } else {
      created++;
    }
  }

  return created;
}

async function syncMessages(
  requestId: string,
  messages: AvinodeMessage[],
  userId: string | null,
  dryRun: boolean
): Promise<number> {
  let created = 0;

  // Get the ISO agent ID if not provided
  let isoAgentId = userId;
  if (!isoAgentId) {
    // Look up from the request
    const { data: request } = await supabase
      .from('requests')
      .select('iso_agent_id')
      .eq('id', requestId)
      .single();
    isoAgentId = request?.iso_agent_id;
  }

  for (const msg of messages) {
    if (dryRun) {
      created++;
      continue;
    }

    // Check if message already exists (by avinode message ID in metadata)
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('request_id', requestId)
      .contains('metadata', { avinode_message_id: msg.id })
      .maybeSingle();

    if (existing) {
      continue; // Skip existing messages
    }

    // Determine sender based on direction
    // valid_sender constraint:
    // - iso_agent: requires sender_iso_agent_id
    // - operator: requires sender_operator_id
    // - ai_assistant/system: no additional requirements

    let senderType: string;
    let senderFields: Record<string, any> = {};

    if (msg.direction === 'outbound') {
      // Buyer message - use iso_agent if we have the ID, otherwise ai_assistant
      if (isoAgentId) {
        senderType = 'iso_agent';
        senderFields = { sender_iso_agent_id: isoAgentId };
      } else {
        senderType = 'ai_assistant';
      }
    } else {
      // Operator message - use operator if we have the ID, otherwise ai_assistant
      if (msg.operatorId) {
        senderType = 'operator';
        senderFields = { sender_operator_id: msg.operatorId };
      } else {
        senderType = 'ai_assistant';
      }
    }

    // Create message
    const { error } = await supabase
      .from('messages')
      .insert({
        request_id: requestId,
        sender_type: senderType,
        sender_name: msg.senderName,
        ...senderFields,
        content: msg.content,
        content_type: 'text',
        status: 'delivered',
        metadata: {
          avinode_message_id: msg.id,
          avinode_operator_id: msg.operatorId,
          source: 'avinode_sync',
          message_direction: msg.direction,
          is_operator_message: msg.direction === 'inbound',
        },
        created_at: msg.timestamp,
      });

    if (error) {
      console.warn(`    Error creating message: ${error.message}`);
    } else {
      created++;
    }
  }

  return created;
}

async function processTripId(tripId: string, report: SyncReport): Promise<void> {
  console.log(`\nProcessing Trip ID: ${tripId}`);

  const detail: SyncReport['details'][0] = {
    tripId,
    status: 'skipped',
  };

  try {
    // Step 1: Fetch trip data from Avinode
    const tripData = await fetchTripFromAvinode(tripId);

    if (!tripData) {
      detail.status = 'error';
      detail.error = 'Trip not found in Avinode';
      report.errors.push(`Trip ${tripId} not found`);
      report.details.push(detail);
      return;
    }

    console.log(`  Trip found: ${tripData.departureAirport.icao} → ${tripData.arrivalAirport.icao}`);

    // Step 2: Create or update request
    const request = await getOrCreateRequest(tripId, tripData, USER_ID, DRY_RUN);

    if (!request) {
      detail.status = 'error';
      detail.error = 'Failed to create/update request';
      report.errors.push(`Failed to process trip ${tripId}`);
      report.details.push(detail);
      return;
    }

    detail.requestId = request.id;
    detail.status = request.created ? 'created' : 'updated';

    if (request.created) {
      report.tripsCreated++;
      console.log(`  ${DRY_RUN ? '[DRY RUN] Would create' : 'Created'} request: ${request.id}`);
    } else {
      report.tripsUpdated++;
      console.log(`  ${DRY_RUN ? '[DRY RUN] Would update' : 'Updated'} request: ${request.id}`);
    }

    // Step 3: Sync RFQs/Quotes
    const rfqs = await fetchRFQsFromAvinode(tripId);
    console.log(`  Found ${rfqs.length} RFQs`);

    const quotesCreated = await syncQuotes(request.id, rfqs, DRY_RUN);
    detail.quotes = quotesCreated;
    report.quotesCreated += quotesCreated;
    console.log(`  ${DRY_RUN ? '[DRY RUN] Would sync' : 'Synced'} ${quotesCreated} quotes`);

    // Step 4: Sync messages (if not skipped)
    if (!SKIP_MESSAGES) {
      const messages = await fetchMessagesFromAvinode(tripId);
      console.log(`  Found ${messages.length} messages`);

      const messagesCreated = await syncMessages(request.id, messages, USER_ID, DRY_RUN);
      detail.messages = messagesCreated;
      report.messagesCreated += messagesCreated;
      console.log(`  ${DRY_RUN ? '[DRY RUN] Would sync' : 'Synced'} ${messagesCreated} messages`);
    }

    report.tripsProcessed++;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    detail.status = 'error';
    detail.error = errorMessage;
    report.errors.push(`Error processing trip ${tripId}: ${errorMessage}`);
    console.error(`  Error: ${errorMessage}`);
  }

  report.details.push(detail);
}

async function runSync(): Promise<SyncReport> {
  const report: SyncReport = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    tripIds: TRIP_IDS,
    tripsProcessed: 0,
    tripsCreated: 0,
    tripsUpdated: 0,
    quotesCreated: 0,
    messagesCreated: 0,
    errors: [],
    details: [],
  };

  for (const tripId of TRIP_IDS) {
    await processTripId(tripId, report);
  }

  return report;
}

function printReport(report: SyncReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('AVINODE TRIP SYNC REPORT');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Mode: ${report.dryRun ? 'DRY RUN (no changes made)' : 'LIVE'}`);
  console.log(`Trip IDs: ${report.tripIds.join(', ')}`);
  console.log('-'.repeat(60));
  console.log(`Trips Processed: ${report.tripsProcessed}`);
  console.log(`  - Created: ${report.tripsCreated}`);
  console.log(`  - Updated: ${report.tripsUpdated}`);
  console.log(`Quotes Created: ${report.quotesCreated}`);
  console.log(`Messages Created: ${report.messagesCreated}`);
  console.log(`Errors: ${report.errors.length}`);

  if (report.errors.length > 0) {
    console.log('\nErrors:');
    report.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  if (VERBOSE) {
    console.log('\nDetails:');
    report.details.forEach((d, i) => {
      console.log(`  ${i + 1}. Trip: ${d.tripId}`);
      console.log(`     Status: ${d.status}`);
      if (d.requestId) console.log(`     Request ID: ${d.requestId}`);
      if (d.quotes !== undefined) console.log(`     Quotes: ${d.quotes}`);
      if (d.messages !== undefined) console.log(`     Messages: ${d.messages}`);
      if (d.error) console.log(`     Error: ${d.error}`);
    });
  }

  console.log('='.repeat(60));

  if (report.dryRun) {
    console.log('\nThis was a dry run. To apply changes, run without --dry-run flag.');
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Avinode Trip Sync Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Trip IDs: ${TRIP_IDS.join(', ')}`);
  console.log(`User ID: ${USER_ID || '(auto-detect)'}`);
  console.log(`Skip Messages: ${SKIP_MESSAGES ? 'Yes' : 'No'}`);
  console.log(`Verbose: ${VERBOSE ? 'Yes' : 'No'}`);
  console.log(`Avinode API: Configured (${avinodeBaseUrl})`);

  const report = await runSync();
  printReport(report);

  // Save report to file
  const reportPath = resolve(__dirname, `../../logs/sync-avinode-trips-${Date.now()}.json`);
  try {
    const { writeFileSync, mkdirSync } = await import('fs');
    mkdirSync(resolve(__dirname, '../../logs'), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);
  } catch (err) {
    console.warn('Could not save report file:', err);
  }

  if (report.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
