/**
 * Update ISO Agent for Trip Requests
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TARGET_EMAIL = process.argv[2] || 'kinglerbercy@gmail.com';

async function updateIsoAgent() {
  console.log(`Looking for iso_agent with email: ${TARGET_EMAIL}`);

  // Find the iso_agent
  const { data: agent, error: agentError } = await supabase
    .from('iso_agents')
    .select('id, email, full_name')
    .eq('email', TARGET_EMAIL)
    .single();

  if (agentError || !agent) {
    console.log('Error finding iso_agent:', agentError?.message || 'Not found');

    // List available agents
    const { data: agents } = await supabase
      .from('iso_agents')
      .select('id, email, full_name');
    console.log('\nAvailable iso_agents:');
    agents?.forEach(a => console.log(`  - ${a.email} (${a.full_name})`));
    return;
  }

  console.log(`Found: ${agent.full_name} (${agent.email})`);
  console.log(`ID: ${agent.id}`);

  // Update all requests with avinode_trip_id
  const { data: updated, error: updateError } = await supabase
    .from('requests')
    .update({ iso_agent_id: agent.id })
    .not('avinode_trip_id', 'is', null)
    .select('avinode_trip_id');

  if (updateError) {
    console.log('Error updating requests:', updateError.message);
    return;
  }

  console.log(`\nUpdated ${updated.length} requests:`);
  updated.forEach(r => console.log(`  - ${r.avinode_trip_id}`));

  // Get request IDs to update messages
  const { data: requests } = await supabase
    .from('requests')
    .select('id')
    .not('avinode_trip_id', 'is', null);

  const requestIds = requests.map(r => r.id);

  // Update messages
  const { error: msgError, count } = await supabase
    .from('messages')
    .update({ sender_iso_agent_id: agent.id })
    .in('request_id', requestIds)
    .eq('sender_type', 'iso_agent');

  if (msgError) {
    console.log('Error updating messages:', msgError.message);
  } else {
    console.log(`\nUpdated iso_agent messages to use ${agent.email}`);
  }

  console.log('\nDone!');
}

updateIsoAgent().catch(console.error);
