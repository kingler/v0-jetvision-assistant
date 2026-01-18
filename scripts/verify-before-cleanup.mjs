import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verify() {
  console.log('=== PRE-CLEANUP VERIFICATION ===\n');

  // 1. Check if tables exist that will be dropped
  console.log('1. TABLES TO BE DROPPED:');
  const tablesToDrop = ['conversations', 'chat_sessions', 'conversation_participants'];

  for (const table of tablesToDrop) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log('   - ' + table + ': Does not exist or error (' + error.code + ')');
      } else {
        console.log('   - ' + table + ': EXISTS with ' + count + ' rows');
      }
    } catch (e) {
      console.log('   - ' + table + ': Error checking');
    }
  }

  // 2. Check columns to be dropped
  console.log('\n2. COLUMNS TO BE DROPPED:');

  // Check messages.conversation_id
  const { data: msgSample } = await supabase
    .from('messages')
    .select('id, conversation_id, request_id')
    .limit(1);

  if (msgSample && msgSample.length > 0) {
    const hasConvId = 'conversation_id' in msgSample[0];
    const hasReqId = 'request_id' in msgSample[0];
    console.log('   - messages.conversation_id: ' + (hasConvId ? 'EXISTS' : 'Already dropped'));
    console.log('   - messages.request_id: ' + (hasReqId ? 'EXISTS' : 'Missing'));
  }

  // Check requests.primary_conversation_id
  const { data: reqSample } = await supabase
    .from('requests')
    .select('id, primary_conversation_id')
    .limit(1);

  if (reqSample && reqSample.length > 0) {
    const hasPrimConvId = 'primary_conversation_id' in reqSample[0];
    console.log('   - requests.primary_conversation_id: ' + (hasPrimConvId ? 'EXISTS' : 'Already dropped'));
  }

  // 3. Verification queries from migration
  console.log('\n3. DATA INTEGRITY CHECKS:');

  // Messages without request_id
  const { count: msgNoReq } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .is('request_id', null);

  console.log('   - Messages without request_id: ' + (msgNoReq || 0));

  // Total messages
  const { count: totalMsg } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });

  console.log('   - Total messages: ' + (totalMsg || 0));

  // 4. Check quotes table
  console.log('\n4. RELATED TABLES STATUS:');

  const { count: quotesCount } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true });
  console.log('   - quotes: ' + (quotesCount || 0) + ' rows');

  const { count: reqCount } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true });
  console.log('   - requests: ' + (reqCount || 0) + ' rows');

  const { count: webhookCount } = await supabase
    .from('avinode_webhook_events')
    .select('*', { count: 'exact', head: true });
  console.log('   - avinode_webhook_events: ' + (webhookCount || 0) + ' rows');

  // 5. Summary
  console.log('\n=== SUMMARY ===');
  console.log('This migration will:');
  console.log('  1. Drop FK constraints referencing deprecated tables');
  console.log('  2. Drop conversation_id columns from messages, quotes, avinode_webhook_events');
  console.log('  3. Drop primary_conversation_id from requests');
  console.log('  4. Drop tables: conversations, chat_sessions, conversation_participants');
  console.log('  5. Drop deprecated enums and functions');
  console.log('  6. Create new RLS policies based on request_id');
  console.log('  7. Clean up orphaned indexes');
}

verify();
