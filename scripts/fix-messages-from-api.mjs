/**
 * Fix Corrupted Messages by Fetching from Avinode API
 *
 * This script fetches quote data directly from Avinode API and updates
 * corrupted messages in the database with the correct content.
 *
 * Usage:
 *   node scripts/fix-messages-from-api.mjs JZLHJF [--dry-run]
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
const AUTH_TOKEN = (process.env.AVINODE_API_KEY || process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN || '').replace(/^Bearer\s+/i, '');
const EXTERNAL_ID = process.env.AVINODE_EXTERNAL_ID || process.env.EXTERNAL_ID || '';

const TRIP_ID = process.argv[2] || 'JZLHJF';
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Extract numeric ID from Avinode ID
 */
function extractNumericId(id) {
  if (/^\d+$/.test(id)) return id;
  const match = id.match(/(\d+)/);
  return match ? match[1] : id;
}

/**
 * Fetch RFQ data from Avinode API
 */
function fetchRFQFromAvinode(rfqId) {
  const timestamp = new Date().toISOString();
  const numericId = extractNumericId(rfqId);

  let cmd = `/usr/bin/curl -s -X GET "${BASE_URL}/rfqs/${numericId}" `;
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
    console.error(`Error fetching RFQ: ${error.message}`);
    return null;
  }
}

/**
 * Fetch quote details from Avinode API
 */
function fetchQuoteFromAvinode(quoteId) {
  const timestamp = new Date().toISOString();
  const numericId = extractNumericId(quoteId);

  let cmd = `/usr/bin/curl -s -X GET "${BASE_URL}/quotes/${numericId}" `;
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
    console.error(`Error fetching quote: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('==============================================');
  console.log('   FIX MESSAGES FROM AVINODE API');
  console.log('==============================================');
  console.log(`Trip ID: ${TRIP_ID}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Get request from database
  const { data: request } = await supabase
    .from('requests')
    .select('id, avinode_trip_id, avinode_rfq_id')
    .eq('avinode_trip_id', TRIP_ID)
    .limit(1)
    .single();

  if (!request) {
    console.log('No request found for this trip ID.');
    process.exit(0);
  }

  // Try trip ID first (for trip-based RFQ endpoint), then RFQ ID
  let rfqData = null;
  let rfqIdToFetch = request.avinode_trip_id;
  
  console.log(`Trying Trip ID first: ${rfqIdToFetch}\n`);
  rfqData = fetchRFQFromAvinode(rfqIdToFetch);
  
  if (!rfqData || rfqData.meta?.errors?.length) {
    // Try RFQ ID if trip ID didn't work
    if (request.avinode_rfq_id) {
      console.log(`Trip ID failed, trying RFQ ID: ${request.avinode_rfq_id}\n`);
      rfqIdToFetch = request.avinode_rfq_id;
      rfqData = fetchRFQFromAvinode(rfqIdToFetch);
    }
  }
  
  if (!rfqData || rfqData.meta?.errors?.length) {
    console.error('Failed to fetch RFQ data:', rfqData?.meta?.errors);
    console.log('Available IDs:');
    console.log(`  Trip ID: ${request.avinode_trip_id}`);
    console.log(`  RFQ ID: ${request.avinode_rfq_id || 'N/A'}`);
    process.exit(1);
  }

  const data = rfqData.data || rfqData;
  console.log(`✅ RFQ Data Retrieved\n`);

  // Collect all seller messages from quotes
  const apiMessages = [];
  if (data.sellerLift) {
    for (const lift of data.sellerLift) {
      if (lift.links?.quotes) {
        for (const quoteLink of lift.links.quotes) {
          const quoteData = fetchQuoteFromAvinode(quoteLink.id);
          if (quoteData) {
            const quoteContent = quoteData.data || quoteData;
            if (quoteContent.sellerMessage) {
              apiMessages.push({
                quoteId: quoteLink.id,
                operator: lift.sellerCompany?.displayName || lift.sellerCompany?.name || 'Unknown Operator',
                message: quoteContent.sellerMessage,
                aircraft: lift.aircraftType || 'N/A',
              });
            }
          }
        }
      }
    }
  }

  console.log(`Found ${apiMessages.length} seller messages from API\n`);

  // Get database messages
  const { data: dbMessages } = await supabase
    .from('messages')
    .select('id, content, sender_type, sender_name, created_at, metadata')
    .eq('request_id', request.id)
    .eq('sender_type', 'operator')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (!dbMessages || dbMessages.length === 0) {
    console.log('No operator messages found in database.');
    process.exit(0);
  }

  console.log(`Found ${dbMessages.length} operator messages in database\n`);

  // Try to match and update
  let updatedCount = 0;
  let matchedCount = 0;

  for (const apiMsg of apiMessages) {
    console.log(`--- Processing API Message ---`);
    console.log(`Operator: ${apiMsg.operator}`);
    console.log(`Quote ID: ${apiMsg.quoteId}`);
    console.log(`Message: "${apiMsg.message.substring(0, 100)}..."\n`);

    // Try to find matching database message
    // Match by operator name (fuzzy match)
    const dbMsg = dbMessages.find(db => {
      const dbOperator = (db.sender_name || '').toLowerCase();
      const apiOperator = apiMsg.operator.toLowerCase();
      const dbWords = dbOperator.split(/\s+/);
      const apiWords = apiOperator.split(/\s+/);
      
      // Check if any significant words match
      return dbWords.some(w => w.length > 3 && apiWords.includes(w)) ||
             apiWords.some(w => w.length > 3 && dbWords.includes(w)) ||
             dbOperator.includes(apiWords[0]) ||
             apiOperator.includes(dbWords[0]);
    });

    if (dbMsg) {
      matchedCount++;
      console.log(`✅ Found database match: ${dbMsg.id.substring(0, 8)}...`);
      console.log(`   DB Operator: ${dbMsg.sender_name}`);
      console.log(`   DB Content: "${dbMsg.content?.substring(0, 100) || 'N/A'}..."`);

      // Check if update is needed
      if (dbMsg.content !== apiMsg.message && 
          !dbMsg.content?.includes('[Message content was corrupted')) {
        console.log(`   ⚠️  Content differs but not corrupted - skipping`);
        continue;
      }

      if (dbMsg.content === apiMsg.message) {
        console.log(`   ✅ Content already matches - no update needed`);
        continue;
      }

      console.log(`   🔄 Updating with API content...`);

      if (!DRY_RUN) {
        const { error } = await supabase
          .from('messages')
          .update({
            content: apiMsg.message,
            metadata: {
              ...(dbMsg.metadata || {}),
              fixed_from_api: true,
              api_quote_id: apiMsg.quoteId,
              original_corrupted_content: dbMsg.content?.substring(0, 500),
              fixed_at: new Date().toISOString(),
              fixed_by: 'fix-messages-from-api.mjs',
            },
          })
          .eq('id', dbMsg.id);

        if (error) {
          console.error(`   ❌ Error updating: ${error.message}`);
        } else {
          console.log(`   ✅ Successfully updated`);
          updatedCount++;
        }
      } else {
        console.log(`   [DRY RUN] Would update`);
        updatedCount++;
      }
    } else {
      console.log(`   ⚠️  No database match found for this operator`);
    }
    console.log('');
  }

  console.log('==============================================');
  console.log('                  SUMMARY');
  console.log('==============================================');
  console.log(`API Messages:        ${apiMessages.length}`);
  console.log(`Database Messages:    ${dbMessages.length}`);
  console.log(`Matched:             ${matchedCount}`);
  console.log(`Updated:             ${updatedCount}`);

  if (DRY_RUN) {
    console.log('\nThis was a DRY RUN. Run without --dry-run to apply updates.');
  } else if (updatedCount > 0) {
    console.log('\n✅ Messages have been updated from API. Please refresh your browser.');
  }
}

main().catch(console.error);
