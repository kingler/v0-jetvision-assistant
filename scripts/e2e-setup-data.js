const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const requestId = '971cf8e5-b02b-44c2-b968-9df52fe2f22e';
  const agentId = 'f19e52fb-70d8-4260-bc00-bbdcda57316a';

  // Update the ISO agent to have a nice name/email for signature testing
  const { data: existingAgent } = await sb.from('iso_agents').select('full_name, email').eq('id', agentId).single();
  console.log('Current agent:', JSON.stringify(existingAgent));

  if (existingAgent) {
    const { error } = await sb.from('iso_agents').update({
      full_name: 'Sarah Martinez',
      email: 'sarah.martinez@jetvision.com',
      first_name: 'Sarah',
      last_name: 'Martinez'
    }).eq('id', agentId);
    console.log('Agent update:', error ? error.message : 'OK - Sarah Martinez');
  }

  // Update request to have KTEB->KVNY, 6 pax, round_trip for richer test data
  const { error: reqErr } = await sb.from('requests').update({
    departure_airport: 'KTEB',
    arrival_airport: 'KVNY',
    passengers: 6,
    trip_type: 'round_trip',
    return_date: '2026-04-10',
    quotes_received: 2
  }).eq('id', requestId);
  console.log('Request update:', reqErr ? reqErr.message : 'OK');

  // Verify final state
  const { data: req } = await sb.from('requests').select('id, departure_airport, arrival_airport, departure_date, return_date, passengers, trip_type, status, iso_agent_id').eq('id', requestId).single();
  console.log('\n=== FINAL STATE ===');
  console.log('Request:', JSON.stringify(req, null, 2));

  const { data: quotes } = await sb.from('quotes').select('id, operator_name, aircraft_type, total_price, avinode_quote_id, schedule').eq('request_id', requestId);
  console.log('Quotes:', quotes.length);
  quotes.forEach(q => {
    console.log(`  ${q.avinode_quote_id}: ${q.operator_name} - ${q.aircraft_type} - $${q.total_price}`);
    console.log('  Schedule:', JSON.stringify(q.schedule));
  });

  const { data: agent } = await sb.from('iso_agents').select('full_name, email').eq('id', agentId).single();
  console.log('Agent:', JSON.stringify(agent));
})();
