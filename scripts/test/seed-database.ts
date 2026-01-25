#!/usr/bin/env tsx
/**
 * Test Database Seeding Script
 *
 * Seeds the test database with fixture data for integration tests.
 * This script is idempotent and can be run multiple times safely.
 *
 * Usage:
 *   pnpm run test:seed
 *
 * Environment Variables Required:
 *   - SUPABASE_URL (or SUPABASE_TEST_URL)
 *   - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_TEST_SERVICE_ROLE_KEY)
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

// Test environment configuration
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL (or SUPABASE_TEST_URL)');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_TEST_SERVICE_ROLE_KEY)');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Test Fixtures
 */

const TEST_USERS = [
  {
    clerk_user_id: 'test_admin_001',
    email: 'admin@test.jetvision.com',
    full_name: 'Test Admin',
    role: 'admin' as const,
    is_active: true,
    commission_percentage: 15,
  },
  {
    clerk_user_id: 'test_sales_001',
    email: 'sales@test.jetvision.com',
    full_name: 'Test Sales Rep',
    role: 'sales_rep' as const,
    is_active: true,
    commission_percentage: 12,
  },
  {
    clerk_user_id: 'test_operator_001',
    email: 'operator@test.jetvision.com',
    full_name: 'Test Operator',
    role: 'operator' as const,
    is_active: true,
  },
];

const TEST_CLIENT_PROFILES = [
  {
    company_name: 'Acme Corporation',
    contact_name: 'John Doe',
    email: 'john@acme.com',
    phone: '+1-555-0100',
    preferences: {
      aircraft_preference: 'Citation X',
      budget_range: '50000-100000',
      notification_preference: 'email',
    },
    notes: 'Preferred client - VIP treatment',
    is_active: true,
  },
  {
    company_name: 'TechStart Inc',
    contact_name: 'Jane Smith',
    email: 'jane@techstart.com',
    phone: '+1-555-0200',
    preferences: {
      aircraft_preference: 'Gulfstream G650',
      budget_range: '100000-200000',
      notification_preference: 'both',
    },
    is_active: true,
  },
];

/**
 * Seed Functions
 */

async function clearTestData() {
  console.log('🧹 Clearing existing test data...');

  // Delete in reverse dependency order
  await supabase.from('agent_executions').delete().like('agent_id', 'test_%');
  await supabase.from('workflow_states').delete().in('current_state', ['test']);
  await supabase.from('proposals').delete().like('notes', '%test%');
  await supabase.from('quotes').delete().like('operator_id', 'test_%');
  await supabase.from('requests').delete().like('notes', '%test%');
  await supabase.from('client_profiles').delete().like('email', '%@test.%');
  await supabase.from('iso_agents').delete().like('email', '%@test.%');

  console.log('✅ Test data cleared');
}

async function seedUsers() {
  console.log('👤 Seeding test users...');

  const { data, error } = await supabase
    .from('iso_agents')
    .upsert(TEST_USERS, {
      onConflict: 'clerk_user_id',
      ignoreDuplicates: false,
    })
    .select();

  if (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }

  console.log(`✅ Seeded ${data.length} test users`);
  return data;
}

async function seedClientProfiles(salesRepId: string) {
  console.log('🏢 Seeding test client profiles...');

  const clientsWithUser = TEST_CLIENT_PROFILES.map(client => ({
    ...client,
    user_id: salesRepId, // Assign to test sales rep
  }));

  const { data, error } = await supabase
    .from('client_profiles')
    .insert(clientsWithUser)
    .select();

  if (error) {
    console.error('❌ Error seeding client profiles:', error);
    throw error;
  }

  console.log(`✅ Seeded ${data.length} test client profiles`);
  return data;
}

async function seedRequests(salesRepId: string, clientId: string) {
  console.log('✈️  Seeding test requests...');

  const testRequest = {
    user_id: salesRepId,
    client_profile_id: clientId,
    departure_airport: 'TEB',
    arrival_airport: 'VNY',
    departure_date: '2025-12-01',
    return_date: '2025-12-05',
    passengers: 6,
    status: 'pending' as const,
    notes: 'Test RFP - Round trip NY to LA',
  };

  const { data, error } = await supabase
    .from('requests')
    .insert(testRequest)
    .select()
    .single();

  if (error) {
    console.error('❌ Error seeding requests:', error);
    throw error;
  }

  console.log('✅ Seeded 1 test request');
  return data;
}

async function seedQuotes(requestId: string) {
  console.log('💰 Seeding test quotes...');

  const testQuotes = [
    {
      request_id: requestId,
      operator_id: 'test_op_001',
      operator_name: 'Jet Charter Co',
      aircraft_type: 'Citation X',
      base_price: 45000,
      fuel_surcharge: 5000,
      taxes: 2500,
      fees: 1500,
      total_price: 54000,
      status: 'pending' as const,
    },
    {
      request_id: requestId,
      operator_id: 'test_op_002',
      operator_name: 'Elite Aviation',
      aircraft_type: 'Gulfstream G650',
      base_price: 85000,
      fuel_surcharge: 8000,
      taxes: 4000,
      fees: 2000,
      total_price: 99000,
      status: 'pending' as const,
    },
  ];

  const { data, error } = await supabase
    .from('quotes')
    .insert(testQuotes)
    .select();

  if (error) {
    console.error('❌ Error seeding quotes:', error);
    throw error;
  }

  console.log(`✅ Seeded ${data.length} test quotes`);
  return data;
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Test Database Seeding Script                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Database: ${SUPABASE_URL}`);
  console.log('');

  try {
    // Step 1: Clear existing test data
    await clearTestData();

    // Step 2: Seed users
    const users = await seedUsers();
    const salesRep = users.find(u => u.role === 'sales_rep');

    if (!salesRep) {
      throw new Error('Sales rep user not created');
    }

    // Step 3: Seed client profiles
    const clients = await seedClientProfiles(salesRep.id);

    // Step 4: Seed requests
    const request = await seedRequests(salesRep.id, clients[0].id);

    // Step 5: Seed quotes
    await seedQuotes(request.id);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          ✅ Database Seeding Complete                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Test Data Summary:');
    console.log(`  • Users: ${users.length}`);
    console.log(`  • Client Profiles: ${clients.length}`);
    console.log(`  • Requests: 1`);
    console.log(`  • Quotes: 2`);
    console.log('');
    console.log('Test Credentials:');
    console.log('  • Admin: admin@test.jetvision.com');
    console.log('  • Sales Rep: sales@test.jetvision.com');
    console.log('  • Operator: operator@test.jetvision.com');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║          ❌ Database Seeding Failed                        ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase, clearTestData };
