/**
 * Seed Database Script
 * Loads test data into Supabase for development
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import type { Database } from '@/lib/types/database';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedDatabase() {
  console.log('🌱 Seeding Jetvision database...\n');

  try {
    // 1. Seed ISO Agents
    console.log('1️⃣  Inserting ISO agents...');
    const { data: agents, error: agentsError } = await supabase
      .from('iso_agents')
      .upsert([
        {
          id: 'a1111111-1111-1111-1111-111111111111',
          clerk_user_id: 'user_test_agent_1',
          email: 'agent1@jetvision.ai',
          full_name: 'John Doe',
          role: 'iso_agent',
          margin_type: 'percentage',
          margin_value: 15.0,
          is_active: true,
          metadata: {
            company: 'Jetvision West',
            territory: 'US-West',
            preferred_operators: ['NetJets', 'VistaJet'],
          },
        },
        {
          id: 'a2222222-2222-2222-2222-222222222222',
          clerk_user_id: 'user_test_agent_2',
          email: 'agent2@jetvision.ai',
          full_name: 'Jane Smith',
          role: 'iso_agent',
          margin_type: 'fixed',
          margin_value: 5000.0,
          is_active: true,
          metadata: {
            company: 'Jetvision East',
            territory: 'US-East',
            preferred_operators: ['FlexJet', 'Wheels Up'],
          },
        },
        {
          id: 'a3333333-3333-3333-3333-333333333333',
          clerk_user_id: 'user_test_admin',
          email: 'admin@jetvision.ai',
          full_name: 'Admin User',
          role: 'admin',
          margin_type: 'percentage',
          margin_value: 0.0,
          is_active: true,
          metadata: {
            company: 'Jetvision HQ',
            access_level: 'full',
          },
        },
      ], { onConflict: 'clerk_user_id' });

    if (agentsError) throw agentsError;
    console.log('   ✓ Inserted 3 ISO agents\n');

    // 2. Seed Client Profiles
    console.log('2️⃣  Inserting client profiles...');
    const { data: clients, error: clientsError } = await supabase
      .from('client_profiles')
      .upsert([
        {
          id: 'c1111111-1111-1111-1111-111111111111',
          iso_agent_id: 'a1111111-1111-1111-1111-111111111111',
          company_name: 'Acme Corporation',
          contact_name: 'Bob Johnson',
          email: 'bob.johnson@acmecorp.com',
          phone: '+1-555-0101',
          preferences: {
            aircraft_preference: ['Light Jet', 'Midsize Jet'],
            catering: 'Standard',
            ground_transport: true,
          },
          notes: 'Prefers NetJets operators. Often flies LAX-JFK route.',
          is_active: true,
        },
        {
          id: 'c2222222-2222-2222-2222-222222222222',
          iso_agent_id: 'a1111111-1111-1111-1111-111111111111',
          company_name: 'Tech Innovators Inc',
          contact_name: 'Alice Williams',
          email: 'alice.williams@techinnovators.com',
          phone: '+1-555-0102',
          preferences: {
            aircraft_preference: ['Heavy Jet'],
            wifi: true,
            specific_amenities: ['Conference room', 'Sleeping berth'],
          },
          notes: 'Executive team frequently travels internationally.',
          is_active: true,
        },
        {
          id: 'c3333333-3333-3333-3333-333333333333',
          iso_agent_id: 'a2222222-2222-2222-2222-222222222222',
          company_name: 'Global Ventures LLC',
          contact_name: 'Michael Brown',
          email: 'michael.brown@globalventures.com',
          phone: '+1-555-0103',
          preferences: {
            aircraft_preference: ['Midsize Jet', 'Super Midsize Jet'],
            pets_allowed: true,
          },
          notes: 'Budget-conscious client. Prefers competitive pricing.',
          is_active: true,
        },
      ], { onConflict: 'id' });

    if (clientsError) throw clientsError;
    console.log('   ✓ Inserted 3 client profiles\n');

    // 3. Seed Requests
    console.log('3️⃣  Inserting RFP requests...');
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .upsert([
        {
          id: 'r1111111-1111-1111-1111-111111111111',
          iso_agent_id: 'a1111111-1111-1111-1111-111111111111',
          client_profile_id: 'c1111111-1111-1111-1111-111111111111',
          departure_airport: 'KLAX',
          arrival_airport: 'KJFK',
          departure_date: new Date('2025-12-15T10:00:00Z'),
          return_date: new Date('2025-12-18T15:00:00Z'),
          passengers: 6,
          status: 'draft',
          special_requirements: 'Catering for 6 passengers, ground transport at destination',
          metadata: {
            trip_purpose: 'Business meeting',
            flexibility: 'Fixed dates',
          },
        },
        {
          id: 'r2222222-2222-2222-2222-222222222222',
          iso_agent_id: 'a1111111-1111-1111-1111-111111111111',
          client_profile_id: 'c2222222-2222-2222-2222-222222222222',
          departure_airport: 'KSFO',
          arrival_airport: 'EGLL',
          departure_date: new Date('2026-01-20T14:00:00Z'),
          passengers: 8,
          status: 'analyzing_proposals',
          special_requirements: 'WiFi, conference setup, sleeping arrangements for 8',
          metadata: {
            trip_purpose: 'International business',
            vip_passengers: true,
          },
        },
        {
          id: 'r3333333-3333-3333-3333-333333333333',
          iso_agent_id: 'a2222222-2222-2222-2222-222222222222',
          client_profile_id: 'c3333333-3333-3333-3333-333333333333',
          departure_airport: 'KMIA',
          arrival_airport: 'KATL',
          departure_date: new Date('2025-11-05T08:00:00Z'),
          passengers: 4,
          status: 'completed',
          special_requirements: 'Pet-friendly aircraft required',
          metadata: {
            trip_purpose: 'Personal travel',
            pets: 1,
          },
        },
      ], { onConflict: 'id' });

    if (requestsError) throw requestsError;
    console.log('   ✓ Inserted 3 requests\n');

    // Check final counts
    console.log('✅ Seed data loaded successfully!\n');
    console.log('📊 Summary:');
    const { count: agentCount } = await supabase.from('iso_agents').select('*', { count: 'exact', head: true });
    const { count: clientCount } = await supabase.from('client_profiles').select('*', { count: 'exact', head: true });
    const { count: requestCount } = await supabase.from('requests').select('*', { count: 'exact', head: true });

    console.log(`   • ISO Agents: ${agentCount}`);
    console.log(`   • Client Profiles: ${clientCount}`);
    console.log(`   • Requests: ${requestCount}\n`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
