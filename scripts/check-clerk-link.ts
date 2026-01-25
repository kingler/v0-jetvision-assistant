#!/usr/bin/env npx tsx
/**
 * Check ISO agents and client profile links
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Checking ISO agents table...\n');

  const { data: agents, error } = await supabase
    .from('iso_agents')
    .select('id, full_name, clerk_user_id, email')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('ISO Agents:');
  for (const a of agents || []) {
    console.log('  - ' + a.full_name + ' (' + a.id + ')');
    console.log('    clerk_user_id: ' + (a.clerk_user_id || 'NULL'));
    console.log('    email: ' + a.email);
    console.log('');
  }

  // Check client_profiles
  const { data: clients, error: clientsError } = await supabase
    .from('client_profiles')
    .select('id, company_name, contact_name, iso_agent_id')
    .limit(5);

  console.log('\nClient Profiles (first 5):');
  for (const c of clients || []) {
    console.log('  - ' + c.company_name + ' (' + c.contact_name + ')');
    console.log('    iso_agent_id: ' + c.iso_agent_id);
  }
}

main();
