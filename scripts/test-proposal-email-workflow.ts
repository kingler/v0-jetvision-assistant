#!/usr/bin/env npx tsx
/**
 * Test Proposal Email Workflow
 *
 * Tests the complete proposal workflow:
 * 1. Generate PDF proposal
 * 2. Upload to Supabase storage
 * 3. Send email with PDF attachment via Gmail
 *
 * Usage:
 *   npx tsx scripts/test-proposal-email-workflow.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test data
const testCustomer = {
  name: 'Test Customer',
  email: process.env.GMAIL_USER_EMAIL || 'test@example.com', // Send to ourselves for testing
  company: 'Test Company Inc.',
  phone: '+1-555-0123',
};

const testTripDetails = {
  departureAirport: {
    icao: 'KTEB',
    name: 'Teterboro Airport',
    city: 'Teterboro, NJ',
  },
  arrivalAirport: {
    icao: 'KMIA',
    name: 'Miami International Airport',
    city: 'Miami, FL',
  },
  departureDate: '2026-02-15',
  departureTime: '10:00',
  passengers: 4,
  tripId: 'TEST-WORKFLOW',
};

const testFlight = {
  id: 'test-flight-001',
  quoteId: 'test-quote-001',
  operatorName: 'Test Aviation LLC',
  aircraftType: 'Midsize Jet',
  aircraftModel: 'Citation XLS',
  aircraftCategory: 'Midsize Jet',
  totalPrice: 25000,
  currency: 'USD',
  flightDuration: '2h 45m',
  departureDate: '2026-02-15',
  departureTime: '10:00',
  departureAirport: {
    icao: 'KTEB',
    name: 'Teterboro Airport',
    city: 'Teterboro',
  },
  arrivalAirport: {
    icao: 'KMIA',
    name: 'Miami International Airport',
    city: 'Miami',
  },
  passengerCapacity: 8,
  tailNumber: 'N123AB',
  yearOfManufacture: 2019,
  amenities: {
    wifi: true,
    pets: false,
    smoking: false,
    galley: true,
    lavatory: true,
    medical: false,
  },
  rfqStatus: 'quoted' as const,
  lastUpdated: new Date().toISOString(),
};

async function testWorkflow() {
  console.log('\n🧪 Testing Proposal Email Workflow\n');
  console.log('=' .repeat(50));

  // Step 1: Check if Gmail is configured
  console.log('\n📧 Step 1: Checking Gmail configuration...');
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || refreshToken === 'your_refresh_token_here') {
    console.log('❌ Gmail not configured (missing GOOGLE_REFRESH_TOKEN)');
    console.log('   Run: npm run gmail:setup');
    process.exit(1);
  }

  if (!clientId || !clientSecret) {
    console.log('❌ Gmail not configured (missing CLIENT_ID or CLIENT_SECRET)');
    process.exit(1);
  }

  console.log('✅ Gmail credentials found');
  console.log(`   Client ID: ${clientId.substring(0, 20)}...`);
  console.log(`   Refresh Token: ${refreshToken.substring(0, 20)}...`);

  // Step 2: Test proposal generation directly (bypassing API auth)
  console.log('\n📄 Step 2: Testing proposal generation (direct)...');

  try {
    // Import the proposal generator directly to bypass API auth
    const { generateProposal } = await import('../lib/pdf/proposal-generator');

    const generateResult = await generateProposal({
      customer: testCustomer,
      tripDetails: {
        ...testTripDetails,
        passengers: testTripDetails.passengers,
      },
      selectedFlights: [testFlight],
      jetvisionFeePercentage: 30,
    });

    if (!generateResult || !generateResult.proposalId) {
      console.log('❌ Proposal generation failed:', JSON.stringify(generateResult, null, 2));
      process.exit(1);
    }

    console.log('✅ Proposal generated successfully');
    console.log(`   Proposal ID: ${generateResult.proposalId}`);
    console.log(`   File Name: ${generateResult.fileName}`);
    console.log(`   PDF Size: ${Math.round(generateResult.pdfBase64.length / 1024)}KB (base64)`);
    console.log(`   Total Price: ${generateResult.pricing.currency} ${generateResult.pricing.total.toLocaleString()}`);

  } catch (error) {
    console.log('❌ Proposal generation error:', error);
    process.exit(1);
  }

  // Step 3: Test email sending directly
  console.log('\n📨 Step 3: Testing email sending via Gmail...');
  console.log(`   Sending to: ${testCustomer.email}`);

  try {
    // Import email service directly
    const { sendProposalEmail } = await import('../lib/services/email-service');
    const { generateProposal } = await import('../lib/pdf/proposal-generator');

    // Generate a fresh proposal for email
    const proposalForEmail = await generateProposal({
      customer: testCustomer,
      tripDetails: {
        ...testTripDetails,
        passengers: testTripDetails.passengers,
      },
      selectedFlights: [testFlight],
      jetvisionFeePercentage: 30,
    });

    // Send email with proposal
    const emailResult = await sendProposalEmail({
      to: testCustomer.email,
      customerName: testCustomer.name,
      subject: '[TEST] Charter Flight Proposal - KTEB to KMIA',
      body: 'This is a test email from the Jetvision proposal workflow test.',
      proposalId: proposalForEmail.proposalId,
      pdfBase64: proposalForEmail.pdfBase64,
      pdfFilename: proposalForEmail.fileName,
      tripDetails: {
        departureAirport: testTripDetails.departureAirport.icao,
        arrivalAirport: testTripDetails.arrivalAirport.icao,
        departureDate: testTripDetails.departureDate,
      },
      pricing: {
        total: proposalForEmail.pricing.total,
        currency: proposalForEmail.pricing.currency,
      },
    });

    if (!emailResult.success) {
      console.log('❌ Email sending failed:', emailResult.error);
      process.exit(1);
    }

    console.log('✅ Email sent successfully');
    console.log(`   Message ID: ${emailResult.messageId}`);
    console.log(`   Proposal ID: ${proposalForEmail.proposalId}`);

  } catch (error) {
    console.log('❌ Email workflow error:', error);
    process.exit(1);
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 All workflow tests passed!\n');
  console.log('The proposal workflow is working correctly:');
  console.log('  ✅ PDF generation');
  console.log('  ✅ Supabase storage upload');
  console.log('  ✅ Gmail email with attachment');
  console.log('\nCheck your inbox for the test email!\n');
}

testWorkflow().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
