#!/usr/bin/env tsx
/**
 * Seed Payment Flow Demo Data
 *
 * Creates a complete payment flow scenario in the database, including:
 * - A request with status 'analyzing_proposals'
 * - A contract (status: sent) linked to the request
 * - Messages simulating the full chat flow:
 *   1. Flight search initiated
 *   2. Proposal sent
 *   3. Contract generated and sent
 *   4. Payment confirmed (payment_confirmed content type)
 *   5. Deal closed (deal_closed content type)
 *
 * Usage: npx tsx scripts/seed-payment-demo.ts
 *
 * @see ONEK-240
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// =============================================================================
// CONSTANTS
// =============================================================================

const DEMO_REQUEST_ID = 'd0000000-0000-4000-a000-000000000001';
const DEMO_CONTRACT_ID = 'd0000000-0000-4000-a000-000000000002';

const DEMO_CONTRACT_NUMBER = 'DEMO-PAY-2026-001';
const DEMO_TRIP_ID = 'DEMOPAYX';

const CUSTOMER = {
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  company: 'Prestige Aviation Partners',
  phone: '+1 (212) 555-8800',
};

const FLIGHT = {
  departure: { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro' },
  arrival: { icao: 'KVNY', name: 'Van Nuys Airport', city: 'Van Nuys' },
  date: '2026-03-01',
  time: '09:00',
  aircraft: 'Gulfstream G650',
  aircraftType: 'Heavy Jet',
  tail: 'N650PM',
  passengers: 8,
};

const PRICING = {
  flightCost: 52000,
  federalExciseTax: 3900,
  domesticSegmentFee: 41.6,
  subtotal: 55941.6,
  creditCardFeePercentage: 5,
  totalAmount: 55941.6,
  currency: 'USD',
};

// Timeline timestamps (spaced over 3 days)
const T_PROPOSAL = '2026-02-25T14:30:00Z';
const T_CONTRACT = '2026-02-26T10:00:00Z';
const T_PAYMENT = '2026-02-27T16:45:00Z';
const T_CLOSED = '2026-02-27T16:46:00Z';

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function getDefaultIsoAgentId(): Promise<string> {
  const { data, error } = await supabase
    .from('iso_agents')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    console.error('❌ No ISO agent found. Seed ISO agents first.');
    process.exit(1);
  }
  return data.id;
}

async function cleanExisting(): Promise<void> {
  console.log('🧹 Cleaning existing demo payment data...');

  // Delete messages for demo request
  await supabase.from('messages').delete().eq('request_id', DEMO_REQUEST_ID);

  // Delete contract
  await supabase.from('contracts').delete().eq('id', DEMO_CONTRACT_ID);

  // Delete request
  await supabase.from('requests').delete().eq('id', DEMO_REQUEST_ID);

  console.log('   Done.');
}

async function seedRequest(isoAgentId: string): Promise<void> {
  console.log('📋 Creating demo request...');

  const { error } = await supabase.from('requests').insert({
    id: DEMO_REQUEST_ID,
    iso_agent_id: isoAgentId,
    status: 'completed',
    phase: 'closed_won',
    departure_airport: FLIGHT.departure.icao,
    arrival_airport: FLIGHT.arrival.icao,
    departure_date: FLIGHT.date,
    departure_time: FLIGHT.time,
    passengers: FLIGHT.passengers,
    aircraft_type: FLIGHT.aircraftType,
    trip_type: 'one_way',
    avinode_trip_id: DEMO_TRIP_ID,
    metadata: {
      demo: true,
      demoType: 'payment-flow',
      customerName: CUSTOMER.name,
      customerEmail: CUSTOMER.email,
    },
    created_at: '2026-02-24T10:00:00Z',
    updated_at: T_CLOSED,
  });

  if (error) {
    console.error('❌ Failed to create request:', error.message);
    process.exit(1);
  }
  console.log(`   Request ${DEMO_REQUEST_ID} created.`);
}

async function seedContract(isoAgentId: string): Promise<void> {
  console.log('📄 Creating demo contract...');

  const { error } = await supabase.from('contracts').insert({
    id: DEMO_CONTRACT_ID,
    contract_number: DEMO_CONTRACT_NUMBER,
    request_id: DEMO_REQUEST_ID,
    iso_agent_id: isoAgentId,
    client_name: CUSTOMER.name,
    client_email: CUSTOMER.email,
    client_company: CUSTOMER.company,
    client_phone: CUSTOMER.phone,
    departure_airport: FLIGHT.departure.icao,
    arrival_airport: FLIGHT.arrival.icao,
    departure_date: FLIGHT.date,
    departure_time: FLIGHT.time,
    aircraft_type: FLIGHT.aircraftType,
    aircraft_model: FLIGHT.aircraft,
    tail_number: FLIGHT.tail,
    passengers: FLIGHT.passengers,
    flight_cost: PRICING.flightCost,
    federal_excise_tax: PRICING.federalExciseTax,
    domestic_segment_fee: PRICING.domesticSegmentFee,
    subtotal: PRICING.subtotal,
    credit_card_fee_percentage: PRICING.creditCardFeePercentage,
    total_amount: PRICING.totalAmount,
    currency: PRICING.currency,
    payment_method: 'wire',
    status: 'completed',
    sent_at: T_CONTRACT,
    sent_to_email: CUSTOMER.email,
    payment_reference: 'WT-2026-DEMO-001',
    payment_amount: PRICING.totalAmount,
    payment_received_at: T_PAYMENT,
    completed_at: T_CLOSED,
    metadata: { demo: true },
    created_at: T_CONTRACT,
    updated_at: T_CLOSED,
  });

  if (error) {
    console.error('❌ Failed to create contract:', error.message);
    process.exit(1);
  }
  console.log(`   Contract ${DEMO_CONTRACT_NUMBER} created.`);
}

async function seedMessages(): Promise<void> {
  console.log('💬 Creating demo messages...');

  const messages = [
    // 1. User request
    {
      request_id: DEMO_REQUEST_ID,
      sender_type: 'operator',
      content: `I need a heavy jet from Teterboro to Van Nuys on March 1st for 8 passengers.`,
      content_type: 'text',
      status: 'sent',
      created_at: '2026-02-24T10:05:00Z',
    },
    // 2. AI acknowledges
    {
      request_id: DEMO_REQUEST_ID,
      sender_type: 'ai_assistant',
      content: `I'll search for available heavy jets from KTEB to KVNY on March 1st for 8 passengers. Creating a trip in Avinode now.`,
      content_type: 'text',
      status: 'sent',
      created_at: '2026-02-24T10:06:00Z',
    },
    // 3. Trip created
    {
      request_id: DEMO_REQUEST_ID,
      sender_type: 'ai_assistant',
      content: `Trip created in Avinode (${DEMO_TRIP_ID}). You can open it in the Avinode Web App to select operators and send the RFP.`,
      content_type: 'text',
      status: 'sent',
      created_at: '2026-02-24T10:07:00Z',
    },
    // 4. Quotes received
    {
      request_id: DEMO_REQUEST_ID,
      sender_type: 'ai_assistant',
      content: `3 operator quotes received for your KTEB to KVNY trip. The best option is a Gulfstream G650 at $52,000 from Executive Aviation LLC.`,
      content_type: 'text',
      status: 'sent',
      created_at: '2026-02-25T09:00:00Z',
    },
    // 5. Proposal sent
    {
      request_id: DEMO_REQUEST_ID,
      sender_type: 'ai_assistant',
      content: `Proposal sent to ${CUSTOMER.name} (${CUSTOMER.email}) for the Gulfstream G650 from KTEB to KVNY on March 1st.`,
      content_type: 'text',
      status: 'sent',
      rich_content: {
        proposalSent: {
          customerName: CUSTOMER.name,
          customerEmail: CUSTOMER.email,
          route: `${FLIGHT.departure.icao} to ${FLIGHT.arrival.icao}`,
          sentAt: T_PROPOSAL,
        },
      },
      created_at: T_PROPOSAL,
    },
    // 6. Contract generated
    {
      request_id: DEMO_REQUEST_ID,
      sender_type: 'ai_assistant',
      content: `Contract ${DEMO_CONTRACT_NUMBER} has been generated and sent to ${CUSTOMER.email}. Total: ${PRICING.currency} ${PRICING.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
      content_type: 'text',
      status: 'sent',
      rich_content: {
        contractSent: {
          contractId: DEMO_CONTRACT_ID,
          contractNumber: DEMO_CONTRACT_NUMBER,
          totalAmount: PRICING.totalAmount,
          currency: PRICING.currency,
          sentTo: CUSTOMER.email,
          sentAt: T_CONTRACT,
        },
      },
      created_at: T_CONTRACT,
    },
    // 7. Payment confirmed
    {
      request_id: DEMO_REQUEST_ID,
      sender_type: 'ai_assistant',
      content: `Payment confirmed for contract ${DEMO_CONTRACT_NUMBER}. Wire transfer of ${PRICING.currency} ${PRICING.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} received.`,
      content_type: 'payment_confirmed',
      status: 'sent',
      rich_content: {
        paymentConfirmed: {
          contractId: DEMO_CONTRACT_ID,
          contractNumber: DEMO_CONTRACT_NUMBER,
          paymentAmount: PRICING.totalAmount,
          paymentMethod: 'wire',
          paymentReference: 'WT-2026-DEMO-001',
          paidAt: T_PAYMENT,
          currency: PRICING.currency,
        },
      },
      created_at: T_PAYMENT,
    },
    // 8. Deal closed
    {
      request_id: DEMO_REQUEST_ID,
      sender_type: 'ai_assistant',
      content: `Deal closed! Contract ${DEMO_CONTRACT_NUMBER} with ${CUSTOMER.name} is complete.`,
      content_type: 'deal_closed',
      status: 'sent',
      rich_content: {
        dealClosed: {
          contractNumber: DEMO_CONTRACT_NUMBER,
          customerName: CUSTOMER.name,
          flightRoute: `${FLIGHT.departure.icao} to ${FLIGHT.arrival.icao}`,
          dealValue: PRICING.totalAmount,
          currency: PRICING.currency,
          proposalSentAt: T_PROPOSAL,
          contractSentAt: T_CONTRACT,
          paymentReceivedAt: T_PAYMENT,
        },
      },
      created_at: T_CLOSED,
    },
  ];

  for (const msg of messages) {
    const { error } = await supabase.from('messages').insert(msg);
    if (error) {
      console.error(`❌ Failed to insert message: ${error.message}`);
      console.error(`   Content: ${msg.content.slice(0, 60)}...`);
    }
  }

  console.log(`   ${messages.length} messages created.`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log('🚀 Seeding payment flow demo data...\n');

  const isoAgentId = await getDefaultIsoAgentId();
  console.log(`   Using ISO agent: ${isoAgentId}\n`);

  await cleanExisting();
  await seedRequest(isoAgentId);
  await seedContract(isoAgentId);
  await seedMessages();

  console.log('\n✅ Payment flow demo seeded successfully!');
  console.log(`   Request ID: ${DEMO_REQUEST_ID}`);
  console.log(`   Contract:   ${DEMO_CONTRACT_NUMBER}`);
  console.log(`   Trip ID:    ${DEMO_TRIP_ID}`);
  console.log('\n   Open the app and navigate to this chat session to see the full payment flow.\n');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
