#!/usr/bin/env npx tsx

/**
 * Test Script: Send Proposal Email for Trip R3WVBX
 *
 * Tests the complete proposal generation and email sending workflow:
 * - Trip ID: R3WVBX
 * - Aircraft: Citation Sovereign
 * - Operator: Panorama Jets
 * - Client: Michael Chen of Apex Ventures
 * - Email: designthrustudio@gmail.com
 */

import { generateProposal } from '../lib/pdf/proposal-generator';
import { sendProposalEmail } from '../lib/services/email-service';
import type { RFQFlight } from '../lib/mcp/clients/avinode-client';
import * as fs from 'fs';
import * as path from 'path';

// Test data based on user's specifications
const tripId = 'R3WVBX';

// Citation Sovereign specifications (realistic data)
const citationSovereignFlight: RFQFlight = {
  id: `quote-${tripId}-001`,
  quoteId: `aquote-${tripId}-001`,
  departureAirport: {
    icao: 'KTEB',
    name: 'Teterboro Airport',
    city: 'Teterboro, NJ',
  },
  arrivalAirport: {
    icao: 'KLAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles, CA',
  },
  departureDate: '2026-02-15',
  departureTime: '09:00',
  flightDuration: '5h 30m',
  aircraftType: 'Midsize Jet',
  aircraftModel: 'Citation Sovereign',
  tailNumber: 'N680PJ',
  yearOfManufacture: 2019,
  passengerCapacity: 9,
  operatorName: 'Panorama Jets',
  operatorRating: 4.7,
  operatorEmail: 'charter@panoramajets.com',
  totalPrice: 42500,
  currency: 'USD',
  priceBreakdown: {
    basePrice: 35000,
    fuelSurcharge: 3200,
    taxes: 2625,
    fees: 1675,
  },
  validUntil: '2026-02-01',
  amenities: {
    wifi: true,
    pets: true,
    smoking: false,
    galley: true,
    lavatory: true,
    medical: false,
  },
  rfqStatus: 'quoted',
  lastUpdated: new Date().toISOString(),
  responseTimeMinutes: 45,
  isSelected: true,
  aircraftCategory: 'Midsize Jet',
  avinodeDeepLink: `https://marketplace.avinode.com/trips/${tripId}`,
};

// Customer information
const customer = {
  name: 'Michael Chen',
  email: 'designthrustudio@gmail.com',
  company: 'Apex Ventures',
  phone: '+1-555-0199',
};

// Trip details
const tripDetails = {
  departureAirport: citationSovereignFlight.departureAirport,
  arrivalAirport: citationSovereignFlight.arrivalAirport,
  departureDate: citationSovereignFlight.departureDate,
  departureTime: citationSovereignFlight.departureTime,
  passengers: 6,
  tripId: tripId,
};

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     SEND PROPOSAL EMAIL TEST - Trip R3WVBX                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // =========================================================================
  // STEP 1: Generate the PDF Proposal
  // =========================================================================
  console.log('┌───────────────────────────────────────────────────────────────┐');
  console.log('│  STEP 1: Generate PDF Proposal                                │');
  console.log('└───────────────────────────────────────────────────────────────┘');
  console.log('');

  let proposalResult;
  try {
    proposalResult = await generateProposal({
      customer,
      tripDetails,
      selectedFlights: [citationSovereignFlight],
      jetvisionFeePercentage: 10,
    });

    console.log('  ✅ PDF Generated Successfully');
    console.log('  ├── Proposal ID:', proposalResult.proposalId);
    console.log('  ├── File Name:', proposalResult.fileName);
    console.log('  ├── PDF Size:', (proposalResult.pdfBuffer.length / 1024).toFixed(2), 'KB');
    console.log('  └── Generated At:', proposalResult.generatedAt);
    console.log('');

    // Save PDF locally for reference
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const pdfPath = path.join(outputDir, proposalResult.fileName);
    fs.writeFileSync(pdfPath, proposalResult.pdfBuffer);
    console.log('  📁 PDF saved to:', pdfPath);
    console.log('');

  } catch (error) {
    console.error('  ❌ Error generating PDF:', error);
    process.exit(1);
  }

  // =========================================================================
  // STEP 2: Prepare Email Content
  // =========================================================================
  console.log('┌───────────────────────────────────────────────────────────────┐');
  console.log('│  STEP 2: Prepare Email Content                                │');
  console.log('└───────────────────────────────────────────────────────────────┘');
  console.log('');

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: proposalResult.pricing.currency,
    maximumFractionDigits: 0,
  }).format(proposalResult.pricing.total);

  const formattedDate = new Date(tripDetails.departureDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  console.log('  📧 Email Details:');
  console.log('  ├── To:', customer.email);
  console.log('  ├── Subject: Jetvision Charter Proposal: KTEB → KLAX');
  console.log('  ├── Attachment:', proposalResult.fileName);
  console.log('  └── Attachment Size:', (proposalResult.pdfBase64.length / 1024).toFixed(2), 'KB (base64)');
  console.log('');

  // =========================================================================
  // STEP 3: Send the Proposal Email
  // =========================================================================
  console.log('┌───────────────────────────────────────────────────────────────┐');
  console.log('│  STEP 3: Send Proposal Email                                  │');
  console.log('└───────────────────────────────────────────────────────────────┘');
  console.log('');

  console.log('  📤 Sending email to:', customer.email);
  console.log('');

  try {
    const emailResult = await sendProposalEmail({
      to: customer.email,
      customerName: customer.name,
      proposalId: proposalResult.proposalId,
      pdfBase64: proposalResult.pdfBase64,
      pdfFilename: proposalResult.fileName,
      tripDetails: {
        departureAirport: tripDetails.departureAirport.icao,
        arrivalAirport: tripDetails.arrivalAirport.icao,
        departureDate: tripDetails.departureDate,
      },
      pricing: proposalResult.pricing,
    });

    if (emailResult.success) {
      console.log('  ✅ Email Sent Successfully!');
      console.log('  ├── Message ID:', emailResult.messageId);
      console.log('  ├── Recipient:', customer.email);
      console.log('  ├── Subject: Jetvision Charter Proposal: KTEB → KLAX');
      console.log('  └── Status: DELIVERED (mock)');
      console.log('');
    } else {
      console.error('  ❌ Email Failed:', emailResult.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('  ❌ Error sending email:', error);
    process.exit(1);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST COMPLETED                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                       EMAIL PREVIEW                             │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log('│ TO:      designthrustudio@gmail.com                             │');
  console.log('│ SUBJECT: Jetvision Charter Proposal: KTEB → KLAX               │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log('│                                                                 │');
  console.log(`│ Dear ${customer.name},                                          │`);
  console.log('│                                                                 │');
  console.log('│ Thank you for considering Jetvision for your private charter   │');
  console.log('│ needs.                                                          │');
  console.log('│                                                                 │');
  console.log('│ Please find attached your customized proposal for your         │');
  console.log('│ upcoming trip:                                                  │');
  console.log('│                                                                 │');
  console.log('│ **Trip Details:**                                               │');
  console.log(`│ • Route: KTEB → KLAX                                            │`);
  console.log(`│ • Date: ${formattedDate.substring(0, 30).padEnd(30)}           │`);
  console.log(`│ • Total: ${formattedPrice.padEnd(40)}                          │`);
  console.log('│                                                                 │');
  console.log(`│ **Proposal ID:** ${proposalResult.proposalId.padEnd(40)}        │`);
  console.log('│                                                                 │');
  console.log('│ [📎 ATTACHMENT: PDF Proposal]                                   │');
  console.log('│                                                                 │');
  console.log('│ This quote is valid for 48 hours. To book or if you have any   │');
  console.log('│ questions, please reply to this email.                         │');
  console.log('│                                                                 │');
  console.log('│ Best regards,                                                   │');
  console.log('│ Kingler Bercy                                                   │');
  console.log('│ Sales Representative                                            │');
  console.log('│ The Jetvision Team                                              │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log('│ ATTACHMENT:                                                     │');
  console.log(`│ 📄 ${proposalResult.fileName.substring(0, 55).padEnd(55)}      │`);
  console.log(`│    Size: ${(proposalResult.pdfBuffer.length / 1024).toFixed(2).padEnd(10)} KB                                       │`);
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');

  console.log('📊 SUMMARY:');
  console.log('  ├── Proposal ID:', proposalResult.proposalId);
  console.log('  ├── Recipient:', customer.email);
  console.log('  ├── Aircraft: Citation Sovereign (Panorama Jets)');
  console.log('  ├── Route: KTEB → KLAX');
  console.log('  ├── Date:', formattedDate);
  console.log('  └── Total:', formattedPrice);
  console.log('');

  console.log('💰 PRICING BREAKDOWN:');
  console.log('  ├── Charter Cost:', '$' + proposalResult.pricing.subtotal.toLocaleString());
  console.log('  ├── Jetvision Fee (10%):', '$' + proposalResult.pricing.jetvisionFee.toLocaleString());
  console.log('  ├── Taxes & Fees:', '$' + proposalResult.pricing.taxes.toLocaleString());
  console.log('  └── TOTAL:', formattedPrice);
  console.log('');

  console.log('⚠️  NOTE: Email sent using MOCK service (Gmail MCP not configured)');
  console.log('   To send real emails, configure GOOGLE_APPLICATION_CREDENTIALS');
  console.log('   and GMAIL_USER_EMAIL in .env.local');
  console.log('');

  console.log('📄 To view the PDF attachment, run:');
  console.log(`   open "test-output/${proposalResult.fileName}"`);
  console.log('');
}

// Run the test
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
