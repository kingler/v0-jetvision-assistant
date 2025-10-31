import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkDatabaseSchema() {
  console.log('🔍 Checking Supabase Database Schema...\n');

  // Check all tables
  const tables = [
    'iso_agents',
    'client_profiles',
    'requests',
    'quotes',
    'workflow_states',
    'agent_executions',
    'proposals',
  ];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`);
      } else {
        console.log(`✅ Table '${table}': EXISTS (${count} rows)`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}': ${err}`);
    }
  }

  console.log('\n📊 Testing actual data fetch...\n');

  // Check iso_agents with actual data
  const { data: agents, error: agentsError } = await supabase
    .from('iso_agents')
    .select('id, email, full_name, role')
    .limit(5);

  if (agentsError) {
    console.log(`❌ Error fetching iso_agents: ${agentsError.message}`);
  } else {
    console.log(`✅ Found ${agents?.length || 0} ISO agents:`);
    agents?.forEach((agent) => {
      console.log(`   - ${agent.full_name} (${agent.email}) - ${agent.role}`);
    });
  }

  // Check client_profiles
  const { data: clients, error: clientsError } = await supabase
    .from('client_profiles')
    .select('id, company_name, contact_name, email')
    .limit(5);

  if (clientsError) {
    console.log(`\n❌ Error fetching client_profiles: ${clientsError.message}`);
  } else {
    console.log(`\n✅ Found ${clients?.length || 0} client profiles:`);
    clients?.forEach((client) => {
      console.log(`   - ${client.company_name} (${client.contact_name})`);
    });
  }

  // Check requests
  const { data: requests, error: requestsError } = await supabase
    .from('requests')
    .select('id, departure_airport, arrival_airport, status, departure_date')
    .limit(5);

  if (requestsError) {
    console.log(`\n❌ Error fetching requests: ${requestsError.message}`);
  } else {
    console.log(`\n✅ Found ${requests?.length || 0} requests:`);
    requests?.forEach((request) => {
      console.log(
        `   - ${request.departure_airport} → ${request.arrival_airport} (${request.status})`
      );
    });
  }

  // Check quotes
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('id, operator_name, total_price, aircraft_type, status')
    .limit(5);

  if (quotesError) {
    console.log(`\n❌ Error fetching quotes: ${quotesError.message}`);
  } else {
    console.log(`\n✅ Found ${quotes?.length || 0} quotes:`);
    quotes?.forEach((quote) => {
      console.log(
        `   - ${quote.operator_name}: $${quote.total_price} (${quote.aircraft_type}) - ${quote.status}`
      );
    });
  }

  // Check proposals
  const { data: proposals, error: proposalsError } = await supabase
    .from('proposals')
    .select('id, proposal_number, title, status, total_amount, final_amount')
    .limit(5);

  if (proposalsError) {
    console.log(`\n❌ Error fetching proposals: ${proposalsError.message}`);
  } else {
    console.log(`\n✅ Found ${proposals?.length || 0} proposals:`);
    if (proposals && proposals.length > 0) {
      proposals?.forEach((proposal) => {
        console.log(
          `   - ${proposal.proposal_number}: ${proposal.title} ($${proposal.final_amount}) - ${proposal.status}`
        );
      });
    } else {
      console.log('   (No proposals yet - table is ready to use)');
    }
  }

  console.log('\n✨ Database schema check complete!');
}

checkDatabaseSchema().catch(console.error);
