/**
 * Diagnose and Fix Corrupted Messages
 *
 * This script checks for corrupted/gibberish message content in the database,
 * specifically for trip ID JZLHJF or any other specified trip ID.
 *
 * Usage:
 *   node scripts/diagnose-corrupted-messages.mjs [trip-id] [--fix]
 *
 * Examples:
 *   node scripts/diagnose-corrupted-messages.mjs JZLHJF
 *   node scripts/diagnose-corrupted-messages.mjs JZLHJF --fix
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load env vars
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TRIP_ID = process.argv[2] || 'JZLHJF';
const SHOULD_FIX = process.argv.includes('--fix');

/**
 * Check if text looks like gibberish/corrupted
 * Simple heuristic: if text contains many non-ASCII characters or unusual patterns
 */
function looksLikeGibberish(text) {
  if (!text || text.length < 10) return false;

  // Check for unusual character patterns
  const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
  const nonAsciiRatio = nonAsciiCount / text.length;

  // If more than 30% non-ASCII, likely corrupted
  if (nonAsciiRatio > 0.3) return true;

  // Check for repeated patterns that suggest encoding issues
  const repeatedPatterns = text.match(/(.{2,})\1{2,}/g);
  if (repeatedPatterns && repeatedPatterns.length > 2) return true;

  // Check if text looks like it might be a simple cipher (Caesar cipher)
  // This is a heuristic - if it looks like English but shifted, it might be corrupted
  const wordPattern = /[a-z]{3,}/gi;
  const words = text.match(wordPattern) || [];
  if (words.length > 5) {
    // Check if words don't match common English patterns
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    const foundCommonWords = words.filter(w => commonWords.includes(w.toLowerCase())).length;
    const commonWordRatio = foundCommonWords / words.length;
    
    // If we have many words but very few common words, might be corrupted
    if (words.length > 10 && commonWordRatio < 0.1) {
      return true;
    }
  }

  return false;
}

/**
 * Attempt to decode corrupted text (simple Caesar cipher detection)
 * This is a best-effort attempt - may not work for all corruption types
 */
function attemptDecode(text) {
  // Try common Caesar cipher shifts (prioritize shift 2 based on observed pattern)
  const shifts = [2, 1, 3, 4, 5, 13, -1, -2, -3];
  
  for (const shift of shifts) {
    const decoded = text.split('').map(char => {
      if (char >= 'a' && char <= 'z') {
        const code = char.charCodeAt(0) - 97;
        const shifted = (code - shift + 26) % 26;
        return String.fromCharCode(shifted + 97);
      } else if (char >= 'A' && char <= 'Z') {
        const code = char.charCodeAt(0) - 65;
        const shifted = (code - shift + 26) % 26;
        return String.fromCharCode(shifted + 65);
      }
      return char;
    }).join('');

    // Check if decoded text looks more like English
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'hello', 'thank', 'please', 'quote', 'aircraft', 'flight', 'from', 'to', 'with', 'best', 'regards'];
    const words = decoded.toLowerCase().match(/[a-z]{3,}/g) || [];
    const foundCommonWords = words.filter(w => commonWords.includes(w)).length;
    
    // More lenient check - if we find some common words, it's likely decoded
    if (words.length > 3 && foundCommonWords > 0) {
      const confidence = foundCommonWords / words.length > 0.15 ? 'high' : 'medium';
      return { decoded, shift, confidence };
    }
  }

  return null;
}

/**
 * Generate proper flight request message from route info
 */
function generateFlightRequestMessage(routeInfo) {
  const dep = routeInfo.departure_airport || 'TBD';
  const arr = routeInfo.arrival_airport || 'TBD';
  const pax = routeInfo.passengers || 1;
  const date = routeInfo.departure_date 
    ? new Date(routeInfo.departure_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'a future date';

  return `I need a flight from ${dep} to ${arr} for ${pax} passenger${pax > 1 ? 's' : ''} on ${date}.`;
}

async function main() {
  console.log('==============================================');
  console.log('   DIAGNOSE CORRUPTED MESSAGES');
  console.log('==============================================');
  console.log(`Trip ID: ${TRIP_ID}`);
  console.log(`Mode: ${SHOULD_FIX ? 'FIX (will update corrupted messages)' : 'DIAGNOSE (read-only)'}`);
  console.log('');

  // Find request with this trip ID
  const { data: requests, error: reqError } = await supabase
    .from('requests')
    .select('id, avinode_trip_id, departure_airport, arrival_airport, departure_date, passengers')
    .eq('avinode_trip_id', TRIP_ID)
    .limit(1);

  if (reqError) {
    console.error('Error fetching request:', reqError.message);
    process.exit(1);
  }

  if (!requests || requests.length === 0) {
    console.log(`No request found for trip ID: ${TRIP_ID}`);
    console.log('Available trip IDs in database:');
    const { data: allRequests } = await supabase
      .from('requests')
      .select('avinode_trip_id')
      .not('avinode_trip_id', 'is', null)
      .limit(20);
    if (allRequests) {
      allRequests.forEach(r => console.log(`  - ${r.avinode_trip_id}`));
    }
    process.exit(0);
  }

  const request = requests[0];
  console.log(`Found request: ${request.id.substring(0, 8)}...`);
  console.log(`Route: ${request.departure_airport || '?'} -> ${request.arrival_airport || '?'}`);
  console.log('');

  // Fetch all messages for this request
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, content, sender_type, sender_name, content_type, created_at, metadata')
    .eq('request_id', request.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (msgError) {
    console.error('Error fetching messages:', msgError.message);
    process.exit(1);
  }

  if (!messages || messages.length === 0) {
    console.log('No messages found for this request.');
    process.exit(0);
  }

  console.log(`Found ${messages.length} messages\n`);

  let corruptedCount = 0;
  const corruptedMessages = [];

  // Check each message
  for (const msg of messages) {
    if (!msg.content) continue;

    const isCorrupted = looksLikeGibberish(msg.content);
    
    if (isCorrupted) {
      corruptedCount++;
      corruptedMessages.push(msg);

      console.log(`--- CORRUPTED MESSAGE #${corruptedCount} ---`);
      console.log(`ID: ${msg.id.substring(0, 8)}...`);
      console.log(`Sender: ${msg.sender_type} (${msg.sender_name || 'N/A'})`);
      console.log(`Created: ${msg.created_at}`);
      console.log(`Content (first 200 chars):`);
      console.log(`  "${msg.content.substring(0, 200)}"`);
      console.log('');

      // Try to decode
      const decoded = attemptDecode(msg.content);
      if (decoded) {
        console.log(`  Attempted decode (shift ${decoded.shift}):`);
        console.log(`  "${decoded.decoded.substring(0, 200)}"`);
        console.log('');
      }
    }
  }

  if (corruptedCount === 0) {
    console.log('✅ No corrupted messages found. All messages look valid.');
    process.exit(0);
  }

  console.log(`\nFound ${corruptedCount} corrupted message(s).\n`);

  if (!SHOULD_FIX) {
    console.log('Run with --fix flag to attempt to fix corrupted messages.');
    console.log('Example: node scripts/diagnose-corrupted-messages.mjs JZLHJF --fix');
    process.exit(0);
  }

  // Attempt to fix corrupted messages
  console.log('Attempting to fix corrupted messages...\n');

  const routeInfo = {
    departure_airport: request.departure_airport,
    arrival_airport: request.arrival_airport,
    departure_date: request.departure_date,
    passengers: request.passengers,
  };

  let fixedCount = 0;
  let errorCount = 0;

  for (const msg of corruptedMessages) {
    // For iso_agent messages, generate proper flight request
    let newContent = null;

    if (msg.sender_type === 'iso_agent') {
      newContent = generateFlightRequestMessage(routeInfo);
    } else {
      // For other message types (especially operator messages), try to decode
      const decoded = attemptDecode(msg.content);
      if (decoded && (decoded.confidence === 'high' || decoded.confidence === 'medium')) {
        newContent = decoded.decoded;
        console.log(`  Decoded using Caesar cipher shift ${decoded.shift} (confidence: ${decoded.confidence})`);
      } else {
        // Can't decode - use placeholder
        newContent = '[Message content was corrupted and could not be recovered]';
        console.log('  ⚠️  Could not decode - using placeholder');
      }
    }

    console.log(`Fixing message ${msg.id.substring(0, 8)}...`);
    console.log(`  Old: "${msg.content.substring(0, 100)}..."`);
    console.log(`  New: "${newContent.substring(0, 100)}..."`);

    const { error: updateError } = await supabase
      .from('messages')
      .update({
        content: newContent,
        metadata: {
          ...(msg.metadata || {}),
          corrupted_fixed: true,
          original_corrupted_content: msg.content.substring(0, 500), // Store first 500 chars for reference
          fixed_at: new Date().toISOString(),
          fixed_by: 'diagnose-corrupted-messages.mjs',
        },
      })
      .eq('id', msg.id);

    if (updateError) {
      console.error(`  ❌ Error updating: ${updateError.message}`);
      errorCount++;
    } else {
      console.log('  ✅ Fixed successfully');
      fixedCount++;
    }
    console.log('');
  }

  console.log('==============================================');
  console.log('                  SUMMARY');
  console.log('==============================================');
  console.log(`Corrupted messages found:  ${corruptedCount}`);
  console.log(`Messages fixed:            ${fixedCount}`);
  console.log(`Errors:                    ${errorCount}`);

  if (fixedCount > 0) {
    console.log('\n✅ Corrupted messages have been fixed.');
    console.log('Please refresh the chat interface to see the corrected messages.');
  }
}

main().catch(console.error);
