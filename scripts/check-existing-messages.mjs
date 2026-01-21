import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load env vars
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  // Get requests with tripIds
  const { data: requests, error: reqError } = await supabase
    .from('requests')
    .select('id, avinode_trip_id, avinode_rfq_id, departure_airport, arrival_airport, status, session_status, message_count, created_at')
    .not('avinode_trip_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (reqError) {
    console.error('Error fetching requests:', reqError);
    return;
  }

  console.log('\n=== REQUESTS WITH TRIP IDS ===');
  console.log(`Found ${requests?.length || 0} requests with trip IDs\n`);

  // For each request, check if there are messages
  console.log('=== MESSAGES FOR EACH REQUEST ===');
  for (const req of requests || []) {
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, sender_type, content, created_at')
      .eq('request_id', req.id)
      .order('created_at', { ascending: true })
      .limit(5);

    console.log(`\nRequest ${req.id.substring(0, 8)}... (Trip: ${req.avinode_trip_id}):`);
    console.log(`  Route: ${req.departure_airport} → ${req.arrival_airport}`);
    console.log(`  Status: ${req.status}, Session: ${req.session_status}`);
    console.log(`  Message count field: ${req.message_count}`);
    console.log(`  Actual messages found: ${messages?.length || 0}`);
    if (messages && messages.length > 0) {
      messages.forEach((m, i) => {
        const preview = m.content?.substring(0, 80).replace(/\n/g, ' ') || '(empty)';
        console.log(`    [${i+1}] ${m.sender_type}: ${preview}...`);
      });
    } else {
      console.log('    ⚠️  NO MESSAGES FOUND - Chat history was not captured!');
    }
  }

  // Also check total message counts
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });

  const { count: totalRequests } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true });

  console.log('\n=== SUMMARY ===');
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Total messages: ${totalMessages}`);
}

checkData().catch(console.error);
