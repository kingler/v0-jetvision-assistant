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

async function checkSchemaState() {
  console.log('=== CURRENT SCHEMA STATE ===\n');

  // Check which tables exist
  const { data: tables, error: tablesErr } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `
  });

  if (tablesErr) {
    // Try alternative approach - just query each table
    console.log('Could not query pg_tables directly, checking tables individually...\n');

    const tablesToCheck = [
      'conversations',
      'chat_sessions',
      'conversation_participants',
      'messages',
      'requests',
      'quotes',
      'iso_agents',
      'avinode_webhook_events',
      'operator_profiles'
    ];

    console.log('TABLE EXISTS CHECK:');
    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error && error.code === '42P01') {
          console.log('  ❌ ' + table + ': Does NOT exist');
        } else if (error) {
          console.log('  ⚠️  ' + table + ': Error - ' + error.message);
        } else {
          console.log('  ✅ ' + table + ': EXISTS (' + count + ' rows)');
        }
      } catch (e) {
        console.log('  ❌ ' + table + ': ' + e.message);
      }
    }
  } else {
    console.log('Tables:', tables);
  }

  // Check columns on key tables
  console.log('\n\nCOLUMN CHECKS:');

  // Messages columns
  console.log('\n--- messages table columns ---');
  const { data: msgData, error: msgErr } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  if (msgErr) {
    console.log('Error querying messages: ' + msgErr.message);
  } else if (msgData && msgData.length > 0) {
    console.log('Columns: ' + Object.keys(msgData[0]).join(', '));
    console.log('Has conversation_id: ' + ('conversation_id' in msgData[0]));
    console.log('Has request_id: ' + ('request_id' in msgData[0]));
  } else {
    // Try to select specific columns to check
    const { error: convIdErr } = await supabase
      .from('messages')
      .select('conversation_id')
      .limit(1);
    console.log('conversation_id column: ' + (convIdErr ? 'DOES NOT EXIST' : 'EXISTS'));

    const { error: reqIdErr } = await supabase
      .from('messages')
      .select('request_id')
      .limit(1);
    console.log('request_id column: ' + (reqIdErr ? 'DOES NOT EXIST' : 'EXISTS'));
  }

  // Requests columns
  console.log('\n--- requests table columns ---');
  const { data: reqData } = await supabase
    .from('requests')
    .select('*')
    .limit(1);

  if (reqData && reqData.length > 0) {
    console.log('Columns: ' + Object.keys(reqData[0]).join(', '));
    console.log('Has primary_conversation_id: ' + ('primary_conversation_id' in reqData[0]));
  } else {
    const { error: primConvErr } = await supabase
      .from('requests')
      .select('primary_conversation_id')
      .limit(1);
    console.log('primary_conversation_id column: ' + (primConvErr ? 'DOES NOT EXIST' : 'EXISTS'));
  }

  // Quotes columns
  console.log('\n--- quotes table columns ---');
  const { error: quotesConvIdErr } = await supabase
    .from('quotes')
    .select('conversation_id')
    .limit(1);
  console.log('conversation_id column: ' + (quotesConvIdErr ? 'DOES NOT EXIST' : 'EXISTS'));

  // Check orphan messages (without request_id)
  console.log('\n\nORPHAN DATA CHECK:');
  const { count: orphanMsgs } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .is('request_id', null);
  console.log('Messages without request_id: ' + (orphanMsgs || 0));

  // Check messages sample
  console.log('\n--- Sample messages ---');
  const { data: sampleMsgs } = await supabase
    .from('messages')
    .select('id, request_id, sender_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (sampleMsgs) {
    sampleMsgs.forEach((m, i) => {
      console.log((i+1) + '. request_id=' + m.request_id + ', sender=' + m.sender_type);
    });
  }
}

checkSchemaState();
