#!/usr/bin/env npx tsx

/**
 * Test Script: Proposal Generation for Trip R3WVBX
 *
 * Generates a client proposal for:
 * - Trip ID: R3WVBX
 * - Aircraft: Citation Sovereign
 * - Operator: Panorama Jets
 * - Client: Michael Chen of Apex Ventures
 * - Email: designthrustudio@gmail.com
 */

import { generateProposal, prepareProposalData } from '../lib/pdf/proposal-generator';
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
    taxes: 2625, // 7.5% FET
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
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PROPOSAL GENERATION TEST - Trip R3WVBX');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  console.log('📋 TEST PARAMETERS:');
  console.log('  Trip ID:', tripId);
  console.log('  Aircraft:', citationSovereignFlight.aircraftModel);
  console.log('  Operator:', citationSovereignFlight.operatorName);
  console.log('  Client:', customer.name, '(' + customer.company + ')');
  console.log('  Email:', customer.email);
  console.log('');

  console.log('✈️  FLIGHT DETAILS:');
  console.log('  Route:', tripDetails.departureAirport.icao, '→', tripDetails.arrivalAirport.icao);
  console.log('  Date:', tripDetails.departureDate);
  console.log('  Time:', tripDetails.departureTime);
  console.log('  Passengers:', tripDetails.passengers);
  console.log('  Duration:', citationSovereignFlight.flightDuration);
  console.log('');

  console.log('💰 PRICING:');
  console.log('  Base Price: $' + citationSovereignFlight.priceBreakdown?.basePrice.toLocaleString());
  console.log('  Fuel Surcharge: $' + citationSovereignFlight.priceBreakdown?.fuelSurcharge?.toLocaleString());
  console.log('  Taxes (FET): $' + citationSovereignFlight.priceBreakdown?.taxes.toLocaleString());
  console.log('  Fees: $' + citationSovereignFlight.priceBreakdown?.fees.toLocaleString());
  console.log('  Operator Total: $' + citationSovereignFlight.totalPrice.toLocaleString());
  console.log('');

  // Step 1: Prepare proposal data (without generating PDF)
  console.log('📝 STEP 1: Preparing proposal data...');
  try {
    const proposalData = prepareProposalData({
      customer,
      tripDetails,
      selectedFlights: [citationSovereignFlight],
      jetvisionFeePercentage: 10,
    });

    console.log('  ✅ Proposal data prepared');
    console.log('  Proposal ID:', proposalData.proposalId);
    console.log('  Generated At:', proposalData.generatedAt);
    console.log('  Quote Valid Until:', proposalData.quoteValidUntil);
    console.log('');

    console.log('💵 CALCULATED PRICING (with Jetvision fee):');
    console.log('  Subtotal: $' + proposalData.pricing.subtotal.toLocaleString());
    console.log('  Jetvision Fee (10%): $' + proposalData.pricing.jetvisionFee.toLocaleString());
    console.log('  Taxes & Fees: $' + proposalData.pricing.taxes.toLocaleString());
    console.log('  ────────────────────');
    console.log('  TOTAL: $' + proposalData.pricing.total.toLocaleString(), proposalData.pricing.currency);
    console.log('');

  } catch (error) {
    console.error('  ❌ Error preparing proposal data:', error);
    process.exit(1);
  }

  // Step 2: Generate the PDF
  console.log('📄 STEP 2: Generating PDF proposal...');
  try {
    const result = await generateProposal({
      customer,
      tripDetails,
      selectedFlights: [citationSovereignFlight],
      jetvisionFeePercentage: 10,
    });

    console.log('  ✅ PDF generated successfully');
    console.log('  Proposal ID:', result.proposalId);
    console.log('  File Name:', result.fileName);
    console.log('  PDF Size:', (result.pdfBuffer.length / 1024).toFixed(2), 'KB');
    console.log('');

    // Save PDF to file for review
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pdfPath = path.join(outputDir, result.fileName);
    fs.writeFileSync(pdfPath, result.pdfBuffer);
    console.log('  📁 PDF saved to:', pdfPath);
    console.log('');

    // Step 3: Generate email content
    console.log('📧 STEP 3: Email Content Preview:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('TO:', customer.email);
    console.log('SUBJECT: Jetvision Charter Proposal: KTEB → KLAX');
    console.log('');
    console.log('────────────────────────────────────────────────────────────────');
    console.log('');
    console.log(`Dear ${customer.name},`);
    console.log('');
    console.log('Thank you for considering Jetvision for your private charter needs.');
    console.log('');
    console.log('Please find attached your customized proposal for your upcoming trip:');
    console.log('');
    console.log('**Trip Details:**');
    console.log(`• Route: ${tripDetails.departureAirport.icao} (${tripDetails.departureAirport.name}) → ${tripDetails.arrivalAirport.icao} (${tripDetails.arrivalAirport.name})`);
    console.log(`• Date: ${formatDate(tripDetails.departureDate)}`);
    console.log(`• Departure Time: ${tripDetails.departureTime}`);
    console.log(`• Passengers: ${tripDetails.passengers}`);
    console.log('');
    console.log('**Aircraft:**');
    console.log(`• Model: ${citationSovereignFlight.aircraftModel}`);
    console.log(`• Operator: ${citationSovereignFlight.operatorName}`);
    console.log(`• Capacity: ${citationSovereignFlight.passengerCapacity} passengers`);
    console.log(`• Registration: ${citationSovereignFlight.tailNumber}`);
    console.log('');
    console.log(`**Total: $${result.pricing.total.toLocaleString()} ${result.pricing.currency}**`);
    console.log('');
    console.log(`**Proposal ID:** ${result.proposalId}`);
    console.log('');
    console.log('[Attachment: PDF Proposal]');
    console.log('');
    console.log('This quote is valid until ' + formatDate(citationSovereignFlight.validUntil!) + '.');
    console.log('To book or if you have any questions, please reply to this email');
    console.log('or contact our team directly.');
    console.log('');
    console.log('Best regards,');
    console.log('Kingler Bercy');
    console.log('Sales Representative');
    console.log('The Jetvision Team');
    console.log('');
    console.log('────────────────────────────────────────────────────────────────');
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✅ PROPOSAL GENERATION TEST COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 SUMMARY:');
    console.log('  Proposal ID:', result.proposalId);
    console.log('  PDF File:', result.fileName);
    console.log('  PDF Size:', (result.pdfBuffer.length / 1024).toFixed(2), 'KB');
    console.log('  PDF Location:', pdfPath);
    console.log('');
    console.log('💰 FINAL PRICING:');
    console.log('  Charter Cost: $' + result.pricing.subtotal.toLocaleString());
    console.log('  Jetvision Fee: $' + result.pricing.jetvisionFee.toLocaleString());
    console.log('  Taxes & Fees: $' + result.pricing.taxes.toLocaleString());
    console.log('  ═══════════════════');
    console.log('  TOTAL: $' + result.pricing.total.toLocaleString(), result.pricing.currency);
    console.log('');
    console.log('📄 To view the PDF, open:');
    console.log(`   open "${pdfPath}"`);
    console.log('');

  } catch (error) {
    console.error('  ❌ Error generating PDF:', error);
    process.exit(1);
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Run the test
main().catch(console.error);
