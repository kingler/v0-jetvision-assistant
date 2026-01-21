/**
 * Fetch Operator Messages from Avinode
 *
 * Fetches trip messages (operator communications) and stores them in the database
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { execSync } from 'child_process';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Avinode API config
const BASE_URL = process.env.BASE_URI || process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';
const API_TOKEN = process.env.API_TOKEN || process.env.AVINODE_API_TOKEN;
const AUTH_TOKEN = (process.env.AVINODE_API_KEY || process.env.AUTHENTICATION_TOKEN || '').replace(/^Bearer\s+/i, '');
const EXTERNAL_ID = process.env.AVINODE_EXTERNAL_ID || process.env.EXTERNAL_ID || '';

/**
 * Make API call to Avinode
 */
function avinodeGet(endpoint) {
  const timestamp = new Date().toISOString();

  let cmd = `/usr/bin/curl -s -X GET "${BASE_URL}${endpoint}" `;
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
 * Ensure operator profile exists
 */
async function ensureOperatorProfile(operatorData) {
  if (!operatorData?.id) return null;

  // Check if exists
  const { data: existing } = await supabase
    .from('operator_profiles')
    .select('id')
    .eq('avinode_operator_id', operatorData.id)
    .single();

  if (existing) return existing.id;

  // Create new
  const { data: newOp, error } = await supabase
    .from('operator_profiles')
    .insert({
      avinode_operator_id: operatorData.id,
      avinode_company_id: operatorData.id,
      company_name: operatorData.displayName || 'Unknown Operator',
      contact_email: operatorData.contactInfo?.emails?.[0],
      contact_phone: operatorData.contactInfo?.phone,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.log(`    Warning: Could not create operator profile: ${error.message}`);
    return null;
  }

  console.log(`    Created operator profile: ${operatorData.displayName}`);
  return newOp.id;
}

async function main() {
  console.log('==============================================');
  console.log('   FETCH OPERATOR MESSAGES FROM AVINODE');
  console.log('==============================================\n');

  // Get all requests with trip IDs
  const { data: requests } = await supabase
    .from('requests')
    .select('id, avinode_trip_id')
    .not('avinode_trip_id', 'is', null);

  console.log(`Found ${requests.length} trips to process\n`);

  let totalMessages = 0;

  for (const req of requests) {
    const tripId = req.avinode_trip_id;
    console.log(`--- Trip: ${tripId} ---`);

    // First get trip data to find message references
    const tripData = avinodeGet(`/trips/${tripId}`);

    if (!tripData || tripData.meta?.errors?.length > 0) {
      console.log(`  Could not fetch trip data`);
      continue;
    }

    // Get message references from trip
    const messageRefs = tripData.data?.links?.tripmsgs || [];
    console.log(`  Found ${messageRefs.length} message reference(s)`);

    if (messageRefs.length === 0) {
      // Try getting messages directly
      const msgsData = avinodeGet(`/trips/${tripId}/messages`);
      if (msgsData?.data) {
        messageRefs.push(...(msgsData.data || []));
      }
    }

    for (const msgRef of messageRefs) {
      const msgId = msgRef.id || msgRef;

      // Fetch full message details
      const msgData = avinodeGet(`/tripmsgs/${msgId}`);

      if (!msgData || msgData.meta?.errors?.length > 0) {
        console.log(`    Could not fetch message ${msgId}`);
        continue;
      }

      const msg = msgData.data || msgData;

      // Skip if not from seller/operator
      if (!msg.sellerCompany && !msg.sellerAccount) {
        continue;
      }

      // Check if message already exists
      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .eq('request_id', req.id)
        .contains('metadata', { avinode_message_id: msgId });

      if (existing?.length > 0) {
        console.log(`    Message ${msgId} already exists`);
        continue;
      }

      // Ensure operator profile exists
      const operatorProfileId = await ensureOperatorProfile(msg.sellerCompany);

      // Find associated quote if any
      let quoteId = null;
      if (msg.sellerQuote?.id) {
        const { data: quote } = await supabase
          .from('quotes')
          .select('id')
          .eq('request_id', req.id)
          .contains('metadata', { avinode_quote_id: msg.sellerQuote.id })
          .single();
        quoteId = quote?.id;
      }

      // Store the message
      const messageContent = msg.message || msg.text || 'Quote submitted';

      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          request_id: req.id,
          quote_id: quoteId,
          sender_type: 'operator',
          sender_operator_id: operatorProfileId,
          sender_name: msg.sellerCompany?.displayName || msg.sellerAccount?.displayName || 'Operator',
          content: messageContent,
          content_type: 'text',
          status: 'delivered',
          metadata: {
            avinode_message_id: msgId,
            avinode_trip_id: tripId,
            seller_company_id: msg.sellerCompany?.id,
            seller_account: msg.sellerAccount?.displayName,
            rfq_accepted: msg.rfqAccepted,
            has_quote: !!msg.sellerQuote,
            quote_price: msg.sellerQuote?.sellerPrice?.price,
            aircraft_type: msg.lift?.[0]?.aircraftType,
          },
          created_at: msg.createdOn || new Date().toISOString(),
        });

      if (insertError) {
        console.log(`    Error storing message: ${insertError.message}`);
      } else {
        const preview = messageContent.substring(0, 50);
        console.log(`    ✓ Stored: "${preview}..." from ${msg.sellerCompany?.displayName || 'Operator'}`);
        totalMessages++;
      }
    }

    // Update message count on request
    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('request_id', req.id);

    await supabase
      .from('requests')
      .update({ message_count: msgCount })
      .eq('id', req.id);
  }

  console.log('\n==============================================');
  console.log(`   COMPLETE: ${totalMessages} operator messages stored`);
  console.log('==============================================');
}

main().catch(console.error);
