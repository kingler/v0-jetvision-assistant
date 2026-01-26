#!/usr/bin/env npx tsx
/**
 * Test Customer Creation
 *
 * Tests the customer creation functionality directly via Supabase.
 *
 * Usage:
 *   npx tsx scripts/test-customer-creation.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

async function testCustomerCreation() {
  console.log('\n🧪 Testing Customer Creation\n');
  console.log('='.repeat(50));

  // Import supabase admin client
  const { supabaseAdmin } = await import('../lib/supabase/admin');

  // Test data
  const testCustomer = {
    company_name: 'Test Aviation Corp',
    contact_name: 'John Test',
    email: `john.test.${Date.now()}@testaviation.com`, // Unique email
    phone: '+1-555-0199',
  };

  console.log('\n📝 Step 1: Get an ISO agent to associate the customer with...');

  // Get the first ISO agent from the database
  const { data: agents, error: agentError } = await supabaseAdmin
    .from('iso_agents')
    .select('*')
    .limit(1);

  if (agentError || !agents || agents.length === 0) {
    console.log('❌ No ISO agents found in database');
    console.log('   Error:', agentError?.message || 'No agents exist');
    process.exit(1);
  }

  const agent = agents[0];
  console.log(`✅ Found ISO agent: ${agent.email} (${agent.id})`);

  console.log('\n📝 Step 2: Creating new customer...');
  console.log('   Company:', testCustomer.company_name);
  console.log('   Contact:', testCustomer.contact_name);
  console.log('   Email:', testCustomer.email);
  console.log('   Phone:', testCustomer.phone);

  const { data: newClient, error: createError } = await supabaseAdmin
    .from('client_profiles')
    .insert({
      iso_agent_id: agent.id,
      company_name: testCustomer.company_name,
      contact_name: testCustomer.contact_name,
      email: testCustomer.email,
      phone: testCustomer.phone,
      preferences: {},
      notes: 'Created via test script',
      is_active: true,
    })
    .select()
    .single();

  if (createError) {
    console.log('❌ Failed to create customer:', createError.message);
    process.exit(1);
  }

  console.log('\n✅ Customer created successfully!');
  console.log('   ID:', newClient.id);
  console.log('   Company:', newClient.company_name);
  console.log('   Contact:', newClient.contact_name);
  console.log('   Email:', newClient.email);
  console.log('   Phone:', newClient.phone);
  console.log('   Created At:', newClient.created_at);

  console.log('\n📝 Step 3: Verifying customer exists in database...');

  const { data: verifyClient, error: verifyError } = await supabaseAdmin
    .from('client_profiles')
    .select('*')
    .eq('id', newClient.id)
    .single();

  if (verifyError || !verifyClient) {
    console.log('❌ Failed to verify customer:', verifyError?.message);
    process.exit(1);
  }

  console.log('✅ Customer verified in database');

  console.log('\n📝 Step 4: Listing all customers for this agent...');

  const { data: allClients, error: listError } = await supabaseAdmin
    .from('client_profiles')
    .select('id, company_name, contact_name, email')
    .eq('iso_agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (listError) {
    console.log('❌ Failed to list customers:', listError.message);
  } else {
    console.log(`✅ Found ${allClients?.length || 0} customers:`);
    allClients?.forEach((client, i) => {
      console.log(`   ${i + 1}. ${client.company_name} - ${client.contact_name} (${client.email})`);
    });
  }

  console.log('\n📝 Step 5: Cleaning up test customer...');

  const { error: deleteError } = await supabaseAdmin
    .from('client_profiles')
    .delete()
    .eq('id', newClient.id);

  if (deleteError) {
    console.log('⚠️  Failed to delete test customer:', deleteError.message);
    console.log('   You may need to manually delete it from the database.');
  } else {
    console.log('✅ Test customer deleted');
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Customer creation test passed!\n');
}

testCustomerCreation().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
