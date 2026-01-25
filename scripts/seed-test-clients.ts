/**
 * Seed Test Clients Script
 * Adds 10 dummy client profiles for testing proposal generation workflow
 * All profiles use designthrustudio@gmail.com for consolidated test inbox
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ISO Agent IDs from existing database
// These are actual ISO agents in the production database
const ISO_AGENT_1 = '77276a7d-4c26-4c0b-81d5-59b9d479cf32'; // Kham L
const ISO_AGENT_2 = 'f19e52fb-70d8-4260-bc00-bbdcda57316a'; // Kingler Bercy (designthrustudio@gmail.com)
const ISO_AGENT_3 = 'e26aacb7-da3b-4013-91f9-16e76472f82b'; // Kingler Bercy (kinglerbercy@gmail.com)

// Test email for all clients
const TEST_EMAIL = 'designthrustudio@gmail.com';

// Deterministic UUIDs for test clients (based on pattern)
const testClients = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    iso_agent_id: ISO_AGENT_1,
    company_name: 'Apex Ventures',
    contact_name: 'Michael Chen',
    email: TEST_EMAIL,
    phone: '+1-415-555-0101',
    preferences: {
      aircraft_preference: ['Heavy Jet', 'Ultra Long Range'],
      wifi: true,
      catering: 'Premium',
      ground_transport: true,
    },
    notes: 'Tech executive, prefers heavy jets with full connectivity. Regular KSFO-KJFK traveler.',
    is_active: true,
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    iso_agent_id: ISO_AGENT_1,
    company_name: 'Sterling Holdings',
    contact_name: 'Sarah Mitchell',
    email: TEST_EMAIL,
    phone: '+1-212-555-0102',
    preferences: {
      aircraft_preference: ['Super Midsize Jet', 'Heavy Jet'],
      catering: 'Luxury',
      specific_amenities: ['Champagne service', 'Fresh flowers', 'Custom menu'],
    },
    notes: 'Finance executive, luxury amenities required. VIP treatment essential.',
    is_active: true,
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    iso_agent_id: ISO_AGENT_1,
    company_name: 'Horizon Media Group',
    contact_name: 'David Park',
    email: TEST_EMAIL,
    phone: '+1-310-555-0103',
    preferences: {
      aircraft_preference: ['Light Jet', 'Midsize Jet', 'Super Midsize Jet'],
      flexible_dates: true,
      pets_allowed: true,
    },
    notes: 'Entertainment industry, flexible on aircraft type. Often travels with production team.',
    is_active: true,
  },
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    iso_agent_id: ISO_AGENT_1,
    company_name: 'Quantum Dynamics',
    contact_name: 'Emily Rodriguez',
    email: TEST_EMAIL,
    phone: '+1-206-555-0104',
    preferences: {
      aircraft_preference: ['Heavy Jet', 'Ultra Long Range'],
      wifi: true,
      specific_amenities: ['Satellite phone', 'Conference setup', 'Secure communications'],
    },
    notes: 'Aerospace executive, technical requirements important. Security-conscious client.',
    is_active: true,
  },
  {
    id: 'd5555555-5555-5555-5555-555555555555',
    iso_agent_id: ISO_AGENT_1,
    company_name: 'Pacific Rim Trading',
    contact_name: 'James Tanaka',
    email: TEST_EMAIL,
    phone: '+1-808-555-0105',
    preferences: {
      aircraft_preference: ['Ultra Long Range'],
      international_experience: true,
      specific_amenities: ['Sleeping berth', 'Multi-language crew'],
    },
    notes: 'Import/export executive, frequently flies transpacific routes. Needs ultra-long range aircraft.',
    is_active: true,
  },
  {
    id: 'd6666666-6666-6666-6666-666666666666',
    iso_agent_id: ISO_AGENT_2,
    company_name: 'Evergreen Capital',
    contact_name: 'Lisa Thompson',
    email: TEST_EMAIL,
    phone: '+1-617-555-0106',
    preferences: {
      aircraft_preference: ['Ultra Long Range', 'VIP Airliner'],
      catering: 'Premium',
      specific_amenities: ['Full bedroom', 'Shower', 'Office space'],
    },
    notes: 'Private equity partner, ultra-long range requirements. Often travels with deal team of 8-12.',
    is_active: true,
  },
  {
    id: 'd7777777-7777-7777-7777-777777777777',
    iso_agent_id: ISO_AGENT_2,
    company_name: 'Meridian Healthcare',
    contact_name: 'Robert Williams',
    email: TEST_EMAIL,
    phone: '+1-713-555-0107',
    preferences: {
      aircraft_preference: ['Light Jet', 'Midsize Jet'],
      ground_transport: true,
      time_sensitive: true,
    },
    notes: 'Medical executive, time-sensitive travel. Often needs last-minute bookings for hospital visits.',
    is_active: true,
  },
  {
    id: 'd8888888-8888-8888-8888-888888888888',
    iso_agent_id: ISO_AGENT_2,
    company_name: 'Atlas Manufacturing',
    contact_name: 'Jennifer Brown',
    email: TEST_EMAIL,
    phone: '+1-313-555-0108',
    preferences: {
      aircraft_preference: ['Light Jet', 'Turboprop'],
      budget_conscious: true,
      regional_travel: true,
    },
    notes: 'Industrial executive, cost-conscious. Prefers competitive pricing, regional routes.',
    is_active: true,
  },
  {
    id: 'd9999999-9999-9999-9999-999999999999',
    iso_agent_id: ISO_AGENT_2,
    company_name: 'Summit Consulting',
    contact_name: 'Andrew Kim',
    email: TEST_EMAIL,
    phone: '+1-312-555-0109',
    preferences: {
      aircraft_preference: ['Midsize Jet', 'Super Midsize Jet'],
      wifi: true,
      frequent_flyer: true,
      specific_amenities: ['Power outlets', 'Work tables'],
    },
    notes: 'Management consulting partner, frequent flyer. Books 2-3 trips per week, needs reliability.',
    is_active: true,
  },
  {
    id: 'da000000-0000-0000-0000-000000000000',
    iso_agent_id: ISO_AGENT_2,
    company_name: 'Coastal Properties',
    contact_name: 'Maria Garcia',
    email: TEST_EMAIL,
    phone: '+1-305-555-0110',
    preferences: {
      aircraft_preference: ['Light Jet', 'Very Light Jet'],
      regional_travel: true,
      pets_allowed: true,
    },
    notes: 'Real estate developer, regional travel focus. Frequent Florida-Caribbean routes.',
    is_active: true,
  },
  // Clients for ISO_AGENT_3 (Kingler Bercy - kinglerbercy@gmail.com)
  {
    id: 'db111111-1111-1111-1111-111111111111',
    iso_agent_id: ISO_AGENT_3,
    company_name: 'Apex Ventures',
    contact_name: 'Michael Chen',
    email: TEST_EMAIL,
    phone: '+1-415-555-0201',
    preferences: {
      aircraft_preference: ['Heavy Jet', 'Ultra Long Range'],
      wifi: true,
      catering: 'Premium',
      ground_transport: true,
    },
    notes: 'Tech executive, prefers heavy jets with full connectivity. Regular KSFO-KJFK traveler.',
    is_active: true,
  },
  {
    id: 'db222222-2222-2222-2222-222222222222',
    iso_agent_id: ISO_AGENT_3,
    company_name: 'Tech Innovations Corp',
    contact_name: 'Amanda Stevens',
    email: TEST_EMAIL,
    phone: '+1-650-555-0202',
    preferences: {
      aircraft_preference: ['Midsize Jet', 'Super Midsize Jet'],
      wifi: true,
      specific_amenities: ['Conference setup', 'Large cabin'],
    },
    notes: 'Silicon Valley startup founder, often travels with team of 6-8 for investor meetings.',
    is_active: true,
  },
  {
    id: 'db333333-3333-3333-3333-333333333333',
    iso_agent_id: ISO_AGENT_3,
    company_name: 'Global Finance Partners',
    contact_name: 'Richard Montgomery',
    email: TEST_EMAIL,
    phone: '+1-212-555-0203',
    preferences: {
      aircraft_preference: ['Heavy Jet', 'Ultra Long Range'],
      catering: 'Luxury',
      specific_amenities: ['Secure communications', 'Full office setup'],
    },
    notes: 'Investment banker, requires discretion and luxury. International routes to London and Hong Kong.',
    is_active: true,
  },
  {
    id: 'db444444-4444-4444-4444-444444444444',
    iso_agent_id: ISO_AGENT_3,
    company_name: 'Sunrise Entertainment',
    contact_name: 'Victoria Lane',
    email: TEST_EMAIL,
    phone: '+1-310-555-0204',
    preferences: {
      aircraft_preference: ['Heavy Jet', 'VIP Airliner'],
      pets_allowed: true,
      catering: 'Gourmet',
    },
    notes: 'Film producer, travels with entourage. Requires privacy and luxury amenities.',
    is_active: true,
  },
  {
    id: 'db555555-5555-5555-5555-555555555555',
    iso_agent_id: ISO_AGENT_3,
    company_name: 'Precision Medical',
    contact_name: 'Dr. James Wright',
    email: TEST_EMAIL,
    phone: '+1-617-555-0205',
    preferences: {
      aircraft_preference: ['Light Jet', 'Midsize Jet'],
      time_sensitive: true,
      ground_transport: true,
    },
    notes: 'Medical specialist, time-critical travel for consultations. Often needs same-day bookings.',
    is_active: true,
  },
];

async function seedTestClients() {
  console.log('🌱 Seeding test client profiles...\n');
  console.log(`📧 All clients will use email: ${TEST_EMAIL}\n`);

  try {
    // Verify ISO agents exist first
    console.log('1️⃣  Verifying ISO agents exist...');
    const { data: agents, error: agentsError } = await supabase
      .from('iso_agents')
      .select('id, full_name, email')
      .in('id', [ISO_AGENT_1, ISO_AGENT_2, ISO_AGENT_3]);

    if (agentsError) throw agentsError;

    if (!agents || agents.length < 1) {
      console.error('❌ ISO agents not found. Please run the main seed script first:');
      console.error('   npx tsx scripts/database/seed-database.ts');
      process.exit(1);
    }

    console.log(`   ✓ Found ${agents.length} ISO agents:`);
    agents.forEach(a => console.log(`     - ${a.full_name} (${a.id})`));
    console.log('');

    // Insert test clients
    console.log('2️⃣  Inserting test client profiles...');
    const { data: clients, error: clientsError } = await supabase
      .from('client_profiles')
      .upsert(testClients, { onConflict: 'id' })
      .select();

    if (clientsError) throw clientsError;
    console.log(`   ✓ Inserted ${clients?.length ?? 0} test client profiles\n`);

    // Display summary
    console.log('✅ Test clients seeded successfully!\n');
    console.log('📊 Summary by ISO Agent:');

    const agent1Clients = testClients.filter(c => c.iso_agent_id === ISO_AGENT_1);
    const agent2Clients = testClients.filter(c => c.iso_agent_id === ISO_AGENT_2);
    const agent3Clients = testClients.filter(c => c.iso_agent_id === ISO_AGENT_3);

    console.log(`\n   Kham L (${ISO_AGENT_1.slice(0, 8)}...):`);
    agent1Clients.forEach(c => console.log(`     • ${c.company_name} - ${c.contact_name}`));

    console.log(`\n   Kingler Bercy - designthrustudio (${ISO_AGENT_2.slice(0, 8)}...):`);
    agent2Clients.forEach(c => console.log(`     • ${c.company_name} - ${c.contact_name}`));

    console.log(`\n   Kingler Bercy - kinglerbercy (${ISO_AGENT_3.slice(0, 8)}...):`);
    agent3Clients.forEach(c => console.log(`     • ${c.company_name} - ${c.contact_name}`));

    // Final count
    const { count } = await supabase
      .from('client_profiles')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📈 Total client profiles in database: ${count}`);
    console.log(`\n🔗 Test with proposal workflow by selecting any of these clients.`);
    console.log(`   All proposal emails will be sent to: ${TEST_EMAIL}\n`);

  } catch (error) {
    console.error('❌ Error seeding test clients:', error);
    process.exit(1);
  }
}

seedTestClients();
