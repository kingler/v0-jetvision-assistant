/**
 * Fix Corrupted Messages - Version 2
 *
 * This script attempts to decode corrupted messages using various Caesar cipher shifts
 * and picks the one that produces the most readable English text.
 *
 * Usage:
 *   node scripts/fix-corrupted-messages-v2.mjs JZLHJF [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TRIP_ID = process.argv[2] || 'JZLHJF';
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Common English words for validation
 */
const COMMON_WORDS = [
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day',
  'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
  'did', 'let', 'put', 'say', 'she', 'too', 'use', 'hello', 'thank', 'please', 'quote', 'aircraft', 'flight',
  'from', 'to', 'with', 'best', 'regards', 'submitted', 'following', 'message', 'price', 'available', 'contact'
];

/**
 * Decode text with a Caesar cipher shift
 */
function decodeCaesar(text, shift) {
  return text.split('').map(char => {
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
}

/**
 * Score decoded text based on how many common English words it contains
 */
function scoreDecoded(text) {
  const words = text.toLowerCase().match(/[a-z]{3,}/g) || [];
  if (words.length === 0) return 0;
  
  const foundCommonWords = words.filter(w => COMMON_WORDS.includes(w)).length;
  const ratio = foundCommonWords / words.length;
  
  // Bonus for longer texts with good word ratio
  return ratio * 100 + (words.length > 10 ? 10 : 0);
}

/**
 * Find the best decoding for corrupted text
 */
function findBestDecoding(text) {
  if (!text || text.length < 10) return null;
  
  let bestScore = 0;
  let bestDecoded = null;
  let bestShift = null;
  
  // Try all possible shifts
  for (let shift = 1; shift < 26; shift++) {
    const decoded = decodeCaesar(text, shift);
    const score = scoreDecoded(decoded);
    
    if (score > bestScore) {
      bestScore = score;
      bestDecoded = decoded;
      bestShift = shift;
    }
  }
  
  // Only return if we found a reasonably good match
  if (bestScore > 15) {
    return { decoded: bestDecoded, shift: bestShift, score: bestScore };
  }
  
  return null;
}

/**
 * Check if text looks corrupted
 */
function looksCorrupted(text) {
  if (!text || text.length < 10) return false;
  
  // Check if it contains many common English words (if so, probably not corrupted)
  const words = text.toLowerCase().match(/[a-z]{3,}/g) || [];
  const foundCommonWords = words.filter(w => COMMON_WORDS.includes(w)).length;
  const commonWordRatio = foundCommonWords / Math.max(words.length, 1);
  
  // If more than 20% common words, probably not corrupted
  if (commonWordRatio > 0.2) return false;
  
  // Check for patterns that suggest corruption
  const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
  const nonAsciiRatio = nonAsciiCount / text.length;
  
  // If lots of non-ASCII, might be corrupted
  if (nonAsciiRatio > 0.3) return true;
  
  // If few common words, might be corrupted
  if (words.length > 5 && commonWordRatio < 0.1) return true;
  
  return false;
}

async function main() {
  console.log('==============================================');
  console.log('   FIX CORRUPTED MESSAGES V2');
  console.log('==============================================');
  console.log(`Trip ID: ${TRIP_ID}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Find request
  const { data: request } = await supabase
    .from('requests')
    .select('id')
    .eq('avinode_trip_id', TRIP_ID)
    .limit(1)
    .single();

  if (!request) {
    console.log('No request found for this trip ID.');
    process.exit(0);
  }

  // Get all messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, content, sender_type, sender_name, created_at, metadata')
    .eq('request_id', request.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (!messages || messages.length === 0) {
    console.log('No messages found.');
    process.exit(0);
  }

  console.log(`Found ${messages.length} messages\n`);

  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const msg of messages) {
    if (!msg.content || msg.content.includes('[Message content was corrupted')) {
      // Skip already fixed messages or empty messages
      continue;
    }

    const isCorrupted = looksCorrupted(msg.content);
    
    if (!isCorrupted) {
      skippedCount++;
      continue;
    }

    console.log(`--- Fixing message ${msg.id.substring(0, 8)}... ---`);
    console.log(`Sender: ${msg.sender_type} (${msg.sender_name || 'N/A'})`);
    console.log(`Original: "${msg.content.substring(0, 150)}..."`);

    const bestDecoding = findBestDecoding(msg.content);

    if (bestDecoding && bestDecoding.score > 15) {
      console.log(`Decoded (shift ${bestDecoding.shift}, score ${bestDecoding.score.toFixed(1)}):`);
      console.log(`"${bestDecoding.decoded.substring(0, 150)}..."`);

      if (!DRY_RUN) {
        const { error } = await supabase
          .from('messages')
          .update({
            content: bestDecoding.decoded,
            metadata: {
              ...(msg.metadata || {}),
              corrupted_fixed_v2: true,
              original_corrupted_content: msg.content.substring(0, 500),
              decoded_shift: bestDecoding.shift,
              decoded_score: bestDecoding.score,
              fixed_at: new Date().toISOString(),
            },
          })
          .eq('id', msg.id);

        if (error) {
          console.error(`  ❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log('  ✅ Fixed successfully');
          fixedCount++;
        }
      } else {
        console.log('  [DRY RUN] Would fix');
        fixedCount++;
      }
    } else {
      console.log('  ⚠️  Could not find valid decoding - leaving as placeholder');
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('messages')
          .update({
            content: '[Message content was corrupted and could not be recovered]',
            metadata: {
              ...(msg.metadata || {}),
              corrupted_fixed_v2: true,
              original_corrupted_content: msg.content.substring(0, 500),
              fixed_at: new Date().toISOString(),
            },
          })
          .eq('id', msg.id);

        if (error) {
          console.error(`  ❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log('  ✅ Replaced with placeholder');
          fixedCount++;
        }
      }
    }
    console.log('');
  }

  console.log('==============================================');
  console.log('                  SUMMARY');
  console.log('==============================================');
  console.log(`Messages checked:      ${messages.length}`);
  console.log(`Messages fixed:        ${fixedCount}`);
  console.log(`Messages skipped:      ${skippedCount}`);
  console.log(`Errors:                ${errorCount}`);

  if (DRY_RUN) {
    console.log('\nThis was a DRY RUN. Run without --dry-run to apply fixes.');
  } else if (fixedCount > 0) {
    console.log('\n✅ Messages have been fixed. Please refresh your browser.');
  }
}

main().catch(console.error);
