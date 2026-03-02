const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const requestId = '971cf8e5-b02b-44c2-b968-9df52fe2f22e';

  const { data: req } = await sb.from('requests').select('id, departure_airport, arrival_airport, departure_date, passengers, trip_type, status, iso_agent_id').eq('id', requestId).single();
  console.log('Request:', JSON.stringify(req, null, 2));

  if (req && (!req.departure_airport || req.departure_airport === '')) {
    const { error } = await sb.from('requests').update({
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      departure_date: '2026-04-05',
      return_date: '2026-04-10',
      passengers: 6,
      trip_type: 'round_trip',
      quotes_received: 2
    }).eq('id', requestId);
    console.log('Updated request:', error ? error.message : 'OK');
  }

  const { data: agent } = await sb.from('iso_agents').select('full_name, email').eq('id', '5c676cbf-8271-455d-b47b-b47f6dbfc220').single();
  console.log('Agent:', JSON.stringify(agent));
})();
