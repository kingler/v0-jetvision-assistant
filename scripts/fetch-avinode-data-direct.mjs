/**
 * Fetch RFQs and Messages Directly from Avinode API
 *
 * This script fetches data directly from Avinode API to compare with what's
 * stored in the database, helping diagnose encoding/corruption issues.
 *
 * Usage:
 *   node scripts/fetch-avinode-data-direct.mjs JZLHJF
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

/**
 * Extract numeric ID from trip ID (handles both "JZLHJF" and "atrip-12345678" formats)
 */
function extractNumericId(tripId) {
  // If it's already numeric, return as-is
  if (/^\d+$/.test(tripId)) {
    return tripId;
  }
  
  // If it's a short code like "JZLHJF", we need to look it up
  // For now, try using it directly - Avinode might accept short codes
  return tripId;
}

/**
 * Fetch RFQ data from Avinode API
 */
function fetchRFQFromAvinode(tripId) {
  const timestamp = new Date().toISOString();
  const numericId = extractNumericId(tripId);

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
 * Fetch trip messages from Avinode API
 */
function fetchTripMessagesFromAvinode(tripId) {
  const timestamp = new Date().toISOString();
  const numericId = extractNumericId(tripId);

  let cmd = `/usr/bin/curl -s -X GET "${BASE_URL}/tripmsgs/${numericId}" `;
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
    console.error(`Error fetching messages: ${error.message}`);
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
  console.log('   FETCH AVINODE DATA DIRECTLY');
  console.log('==============================================');
  console.log(`Trip ID: ${TRIP_ID}`);
  console.log(`API Base URL: ${BASE_URL}\n`);

  // First, get the request from database to find the actual trip ID
  const { data: request } = await supabase
    .from('requests')
    .select('id, avinode_trip_id, avinode_rfq_id')
    .eq('avinode_trip_id', TRIP_ID)
    .limit(1)
    .single();

  if (!request) {
    console.log('No request found in database for this trip ID.');
    process.exit(0);
  }

  console.log(`Database Request ID: ${request.id.substring(0, 8)}...`);
  console.log(`Avinode Trip ID: ${request.avinode_trip_id}`);
  console.log(`Avinode RFQ ID: ${request.avinode_rfq_id || 'N/A'}\n`);

  // Fetch RFQ data from Avinode (use RFQ ID if available, otherwise trip ID)
  const rfqIdToFetch = request.avinode_rfq_id || request.avinode_trip_id;
  console.log('--- Fetching RFQ Data from Avinode API ---\n');
  console.log(`Fetching RFQ ID: ${rfqIdToFetch}\n`);
  const rfqData = fetchRFQFromAvinode(rfqIdToFetch);
  
  if (rfqData) {
    if (rfqData.meta?.errors && rfqData.meta.errors.length > 0) {
      console.error('API Errors:', JSON.stringify(rfqData.meta.errors, null, 2));
    } else {
      console.log('✅ RFQ Data Retrieved');
      const data = rfqData.data || rfqData;
      console.log(`RFQ ID: ${data.id || data.rfq_id || 'N/A'}`);
      console.log(`Status: ${data.status || 'N/A'}`);
      
      // Check for seller messages in quotes
      if (data.sellerLift) {
        console.log(`\nSeller Lifts: ${data.sellerLift.length}`);
        for (let i = 0; i < data.sellerLift.length; i++) {
          const lift = data.sellerLift[i];
          console.log(`\n  Lift ${i + 1}:`);
          console.log(`    Aircraft: ${lift.aircraftType || 'N/A'}`);
          console.log(`    Operator: ${lift.sellerCompany?.displayName || lift.sellerCompany?.name || 'N/A'}`);
          if (lift.sellerMessage) {
            console.log(`    Message in Lift: "${lift.sellerMessage.substring(0, 150)}..."`);
          }
          if (lift.links?.quotes && lift.links.quotes.length > 0) {
            console.log(`    Quotes: ${lift.links.quotes.length}`);
            for (let j = 0; j < lift.links.quotes.length; j++) {
              const quoteLink = lift.links.quotes[j];
              console.log(`      Quote ${j + 1}: ${quoteLink.id}`);
              // Fetch quote details to get sellerMessage
              const quoteData = fetchQuoteFromAvinode(quoteLink.id);
              if (quoteData) {
                const quoteDataContent = quoteData.data || quoteData;
                if (quoteDataContent.sellerMessage) {
                  console.log(`        ✅ Message from API: "${quoteDataContent.sellerMessage.substring(0, 200)}..."`);
                } else {
                  console.log(`        ⚠️  No sellerMessage in quote data`);
                  console.log(`        Quote data keys: ${Object.keys(quoteDataContent).join(', ')}`);
                }
              } else {
                console.log(`        ❌ Failed to fetch quote details`);
              }
            }
          }
        }
      } else {
        console.log('⚠️  No sellerLift found in RFQ data');
        console.log(`RFQ data keys: ${Object.keys(data).join(', ')}`);
      }
    }
  } else {
    console.log('❌ Failed to fetch RFQ data');
  }

  // Fetch trip messages from Avinode
  console.log('\n--- Fetching Trip Messages from Avinode API ---\n');
  const messagesData = fetchTripMessagesFromAvinode(request.avinode_trip_id);
  
  if (messagesData) {
    if (messagesData.meta?.errors) {
      console.error('API Errors:', messagesData.meta.errors);
    } else {
      console.log('✅ Messages Retrieved');
      const messages = messagesData.data?.messages || messagesData.messages || [];
      console.log(`Total Messages: ${messages.length}\n`);
      
      messages.forEach((msg, i) => {
        console.log(`Message ${i + 1}:`);
        console.log(`  ID: ${msg.id || 'N/A'}`);
        console.log(`  From: ${msg.sender?.name || msg.from || 'N/A'} (${msg.sender?.companyName || msg.company || 'N/A'})`);
        console.log(`  Sent: ${msg.sentAt || msg.sent_at || 'N/A'}`);
        if (msg.content) {
          console.log(`  Content (first 200 chars):`);
          console.log(`  "${msg.content.substring(0, 200)}..."`);
        }
        if (msg.message) {
          console.log(`  Message (first 200 chars):`);
          console.log(`  "${msg.message.substring(0, 200)}..."`);
        }
        console.log('');
      });
    }
  } else {
    console.log('❌ Failed to fetch messages');
  }

  // Collect all seller messages from quotes
  const apiSellerMessages = [];
  if (rfqData && !rfqData.meta?.errors?.length) {
    const data = rfqData.data || rfqData;
    if (data.sellerLift) {
      for (const lift of data.sellerLift) {
        if (lift.links?.quotes) {
          for (const quoteLink of lift.links.quotes) {
            const quoteData = fetchQuoteFromAvinode(quoteLink.id);
            if (quoteData) {
              const quoteContent = quoteData.data || quoteData;
              if (quoteContent.sellerMessage) {
                apiSellerMessages.push({
                  quoteId: quoteLink.id,
                  operator: lift.sellerCompany?.displayName || lift.sellerCompany?.name || 'Unknown',
                  message: quoteContent.sellerMessage,
                  aircraft: lift.aircraftType || 'N/A',
                });
              }
            }
          }
        }
      }
    }
  }

  // Compare with database
  console.log('\n--- Comparing API Data with Database ---\n');
  
  const { data: dbMessages } = await supabase
    .from('messages')
    .select('id, content, sender_type, sender_name, created_at, metadata')
    .eq('request_id', request.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (dbMessages) {
    console.log(`Database Messages: ${dbMessages.length}`);
    console.log(`API Seller Messages from Quotes: ${apiSellerMessages.length}\n`);
    
    // Compare operator messages
    const dbOperatorMessages = dbMessages.filter(m => m.sender_type === 'operator');
    console.log(`Database Operator Messages: ${dbOperatorMessages.length}`);
    console.log(`API Seller Messages: ${apiSellerMessages.length}\n`);
    
    console.log('--- API Seller Messages (from Quotes) ---\n');
    apiSellerMessages.forEach((apiMsg, i) => {
      console.log(`API Message ${i + 1}:`);
      console.log(`  Quote ID: ${apiMsg.quoteId}`);
      console.log(`  Operator: ${apiMsg.operator}`);
      console.log(`  Aircraft: ${apiMsg.aircraft}`);
      console.log(`  Message: "${apiMsg.message.substring(0, 200)}..."`);
      console.log('');
    });
    
    console.log('--- Database Operator Messages ---\n');
    dbOperatorMessages.forEach((dbMsg, i) => {
      console.log(`DB Message ${i + 1}:`);
      console.log(`  ID: ${dbMsg.id.substring(0, 8)}...`);
      console.log(`  Operator: ${dbMsg.sender_name || 'N/A'}`);
      console.log(`  Message: "${dbMsg.content?.substring(0, 200) || 'N/A'}..."`);
      console.log(`  Created: ${dbMsg.created_at}`);
      console.log('');
    });
    
    // Try to match messages
    console.log('--- Message Matching ---\n');
    apiSellerMessages.forEach((apiMsg, i) => {
      console.log(`\nAPI Message ${i + 1} (${apiMsg.operator}):`);
      console.log(`  "${apiMsg.message.substring(0, 100)}..."`);
      
      // Try to find matching database message by operator name
      const dbMsg = dbOperatorMessages.find(db => {
        const dbOperator = db.sender_name || '';
        return dbOperator.toLowerCase().includes(apiMsg.operator.toLowerCase().split(' ')[0]) ||
               apiMsg.operator.toLowerCase().includes(dbOperator.toLowerCase().split(' ')[0]);
      });
      
      if (dbMsg) {
        console.log(`  ✅ Database match found: ${dbMsg.id.substring(0, 8)}...`);
        console.log(`  DB Content: "${dbMsg.content?.substring(0, 100) || 'N/A'}..."`);
        
        if (dbMsg.content && dbMsg.content !== apiMsg.message) {
          console.log(`  ⚠️  CONTENT MISMATCH DETECTED!`);
          console.log(`  API (correct): "${apiMsg.message.substring(0, 150)}"`);
          console.log(`  DB (corrupted): "${dbMsg.content.substring(0, 150)}"`);
          
          // Check if DB content looks corrupted
          const looksCorrupted = !dbMsg.content.toLowerCase().match(/(the|and|for|are|but|not|you|all|can|her|was|one|our|out|day|get|has|him|his|how|hello|thank|please|quote|aircraft|flight|from|to|with|best|regards|submitted|following|message|price|available|contact|subject|availability|slots|traffic|rights|schedule|timing|utc|hesitate|further|information)/);
          if (looksCorrupted) {
            console.log(`  🔴 CONFIRMED: Database content is corrupted!`);
          }
        } else if (dbMsg.content === apiMsg.message) {
          console.log(`  ✅ Content matches perfectly`);
        }
      } else {
        console.log(`  ⚠️  No database match found for this operator`);
      }
    });
  }

  console.log('\n==============================================');
  console.log('                  SUMMARY');
  console.log('==============================================');
  console.log('Check the output above to compare:');
  console.log('1. What Avinode API returns (raw data)');
  console.log('2. What is stored in the database');
  console.log('3. Any encoding/corruption differences');
}

main().catch(console.error);
