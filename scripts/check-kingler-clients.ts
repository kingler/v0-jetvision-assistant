#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const KINGLER_ISO_AGENT_ID = 'f19e52fb-70d8-4260-bc00-bbdcda57316a';

async function main() {
  console.log('Checking clients for Kingler Bercy...\n');

  const { data: clients, error } = await supabase
    .from('client_profiles')
    .select('id, company_name, contact_name, email, iso_agent_id')
    .eq('iso_agent_id', KINGLER_ISO_AGENT_ID);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Kingler Bercy clients (' + (clients?.length || 0) + '):');
  for (const c of clients || []) {
    console.log('  - ' + c.company_name + ' (' + c.contact_name + ')');
    console.log('    email: ' + c.email);
  }

  if (clients?.length === 0) {
    console.log('\nNo clients found for Kingler. Checking all clients...');

    const { data: allClients } = await supabase
      .from('client_profiles')
      .select('id, company_name, contact_name, iso_agent_id');

    console.log('\nAll clients in database:');
    for (const c of allClients || []) {
      console.log('  - ' + c.company_name + ': iso_agent_id=' + c.iso_agent_id);
    }
  }
}

main();
