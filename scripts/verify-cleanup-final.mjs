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

async function verifyCleanup() {
  console.log('=== FINAL SCHEMA VERIFICATION ===\n');

  // Check deprecated tables - try to select 1 row
  const deprecatedTables = ['conversations', 'chat_sessions', 'conversation_participants'];

  console.log('DEPRECATED TABLES (should NOT exist):');
  for (const table of deprecatedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('  ✅ ' + table + ': DROPPED (does not exist)');
        } else {
          console.log('  ⚠️  ' + table + ': Error - ' + error.code + ': ' + error.message);
        }
      } else {
        console.log('  ❌ ' + table + ': STILL EXISTS! Found ' + (data ? data.length : 0) + ' row(s)');
      }
    } catch (e) {
      console.log('  ✅ ' + table + ': DROPPED (exception: ' + e.message + ')');
    }
  }

  // Check kept tables
  const keptTables = ['requests', 'messages', 'quotes', 'iso_agents'];

  console.log('\nKEPT TABLES (should exist):');
  for (const table of keptTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('  ❌ ' + table + ': Error - ' + error.message);
    } else {
      console.log('  ✅ ' + table + ': EXISTS (' + count + ' rows)');
    }
  }

  // Check deprecated columns are gone
  console.log('\nDEPRECATED COLUMNS (should NOT exist):');

  // Try to select conversation_id from messages
  const { error: msgConvErr } = await supabase
    .from('messages')
    .select('conversation_id')
    .limit(1);
  console.log('  messages.conversation_id: ' +
    (msgConvErr ? '✅ DROPPED' : '❌ STILL EXISTS'));

  // Try to select primary_conversation_id from requests
  const { error: reqConvErr } = await supabase
    .from('requests')
    .select('primary_conversation_id')
    .limit(1);
  console.log('  requests.primary_conversation_id: ' +
    (reqConvErr ? '✅ DROPPED' : '❌ STILL EXISTS'));

  // Try to select conversation_id from quotes
  const { error: quotesConvErr } = await supabase
    .from('quotes')
    .select('conversation_id')
    .limit(1);
  console.log('  quotes.conversation_id: ' +
    (quotesConvErr ? '✅ DROPPED' : '❌ STILL EXISTS'));

  // Check new columns exist
  console.log('\nNEW COLUMNS (should exist):');

  const { error: reqIdErr } = await supabase
    .from('messages')
    .select('request_id')
    .limit(1);
  console.log('  messages.request_id: ' +
    (reqIdErr ? '❌ MISSING' : '✅ EXISTS'));

  const { error: quoteIdErr } = await supabase
    .from('messages')
    .select('quote_id')
    .limit(1);
  console.log('  messages.quote_id: ' +
    (quoteIdErr ? '❌ MISSING' : '✅ EXISTS'));

  // Check data integrity
  console.log('\nDATA INTEGRITY:');
  const { count: orphanCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .is('request_id', null);
  console.log('  Messages without request_id: ' + (orphanCount || 0) +
    (orphanCount === 0 ? ' ✅' : ' ⚠️'));

  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  console.log('  Total messages: ' + totalMessages);

  const { count: totalRequests } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true });
  console.log('  Total requests: ' + totalRequests);

  const { count: totalUsers } = await supabase
    .from('iso_agents')
    .select('*', { count: 'exact', head: true });
  console.log('  Total iso_agents: ' + totalUsers);

  console.log('\n=== VERIFICATION COMPLETE ===');
}

verifyCleanup();
