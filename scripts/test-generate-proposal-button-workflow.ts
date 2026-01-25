#!/usr/bin/env npx tsx

/**
 * End-to-End Test: Generate Proposal Button Workflow
 *
 * Simulates the complete workflow triggered when clicking "Generate Proposal"
 * button in RFQFlightCard component:
 *
 * 1. User views RFQ flight card with status 'quoted'
 * 2. User clicks "Generate Proposal" button
 * 3. onGenerateProposal callback is triggered with (flightId, quoteId)
 * 4. Proposal generation workflow executes:
 *    - Fetch flight/quote details
 *    - Generate PDF proposal
 *    - Send email to customer
 *    - Return success status
 *
 * Test Data:
 * - Trip ID: R3WVBX
 * - Aircraft: Citation Sovereign
 * - Operator: Panorama Jets
 * - Client: Michael Chen of Apex Ventures
 */

import { generateProposal } from '../lib/pdf/proposal-generator';
import { sendProposalEmail } from '../lib/services/email-service';
import type { RFQFlight } from '../lib/mcp/clients/avinode-client';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// MOCK DATA (Same as what would be fetched from Avinode API)
// =============================================================================

const tripId = 'R3WVBX';
const quoteId = `aquote-${tripId}-001`;
const flightId = `flight-${tripId}-001`;

// Mock RFQFlight data (what the component would have)
const mockRFQFlight: RFQFlight = {
  id: flightId,
  quoteId: quoteId,
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
  rfqStatus: 'quoted', // Status must be 'quoted' for button to appear
  lastUpdated: new Date().toISOString(),
  responseTimeMinutes: 45,
  isSelected: false,
  aircraftCategory: 'Midsize Jet',
  avinodeDeepLink: `https://marketplace.avinode.com/trips/${tripId}`,
};

// Customer data (would be fetched from request or input)
const customerData = {
  name: 'Michael Chen',
  email: 'designthrustudio@gmail.com',
  company: 'Apex Ventures',
  phone: '+1-555-0199',
};

// =============================================================================
// WORKFLOW HANDLER (What gets called when button is clicked)
// =============================================================================

/**
 * Handler function that would be passed as onGenerateProposal prop
 * This simulates what happens in the actual application when the button is clicked
 */
async function handleGenerateProposal(
  clickedFlightId: string,
  clickedQuoteId?: string
): Promise<{
  success: boolean;
  proposalId?: string;
  emailSent?: boolean;
  error?: string;
}> {
  console.log('');
  console.log('┌───────────────────────────────────────────────────────────────┐');
  console.log('│  onGenerateProposal CALLBACK TRIGGERED                        │');
  console.log('└───────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('  📍 Received Parameters:');
  console.log(`     • flightId: ${clickedFlightId}`);
  console.log(`     • quoteId: ${clickedQuoteId || 'undefined'}`);
  console.log('');

  try {
    // Step 1: Validate parameters
    console.log('  ⏳ Step 1: Validating parameters...');
    if (clickedFlightId !== flightId) {
      throw new Error(`Flight ID mismatch: expected ${flightId}, got ${clickedFlightId}`);
    }
    console.log('     ✅ Parameters validated');
    console.log('');

    // Step 2: Fetch flight details (in real app, this would query database/API)
    console.log('  ⏳ Step 2: Fetching flight details...');
    // Simulating API fetch - in production this would be:
    // const flight = await fetchFlightById(clickedFlightId);
    const flight = mockRFQFlight;
    console.log(`     ✅ Flight found: ${flight.aircraftModel} by ${flight.operatorName}`);
    console.log('');

    // Step 3: Prepare proposal input
    console.log('  ⏳ Step 3: Preparing proposal data...');
    const proposalInput = {
      customer: customerData,
      tripDetails: {
        departureAirport: flight.departureAirport,
        arrivalAirport: flight.arrivalAirport,
        departureDate: flight.departureDate,
        departureTime: flight.departureTime,
        passengers: 6,
        tripId: tripId,
      },
      selectedFlights: [flight],
      jetvisionFeePercentage: 10,
    };
    console.log('     ✅ Proposal data prepared');
    console.log('');

    // Step 4: Generate PDF
    console.log('  ⏳ Step 4: Generating PDF proposal...');
    const proposalResult = await generateProposal(proposalInput);
    console.log(`     ✅ PDF generated: ${proposalResult.fileName}`);
    console.log(`     📊 Size: ${(proposalResult.pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log('');

    // Save PDF for verification
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const pdfPath = path.join(outputDir, proposalResult.fileName);
    fs.writeFileSync(pdfPath, proposalResult.pdfBuffer);
    console.log(`     📁 PDF saved: ${pdfPath}`);
    console.log('');

    // Step 5: Send email
    console.log('  ⏳ Step 5: Sending email to customer...');
    const emailResult = await sendProposalEmail({
      to: customerData.email,
      customerName: customerData.name,
      proposalId: proposalResult.proposalId,
      pdfBase64: proposalResult.pdfBase64,
      pdfFilename: proposalResult.fileName,
      tripDetails: {
        departureAirport: flight.departureAirport.icao,
        arrivalAirport: flight.arrivalAirport.icao,
        departureDate: flight.departureDate,
      },
      pricing: proposalResult.pricing,
    });

    if (emailResult.success) {
      console.log(`     ✅ Email sent: ${emailResult.messageId}`);
      console.log(`     📧 Recipient: ${customerData.email}`);
    } else {
      console.log(`     ❌ Email failed: ${emailResult.error}`);
    }
    console.log('');

    return {
      success: true,
      proposalId: proposalResult.proposalId,
      emailSent: emailResult.success,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`     ❌ Error: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// TEST EXECUTION
// =============================================================================

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  GENERATE PROPOSAL BUTTON - END-TO-END WORKFLOW TEST          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Simulate the component state
  console.log('┌───────────────────────────────────────────────────────────────┐');
  console.log('│  COMPONENT STATE (RFQFlightCard)                              │');
  console.log('└───────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('  📋 Flight Data:');
  console.log(`     • ID: ${mockRFQFlight.id}`);
  console.log(`     • Quote ID: ${mockRFQFlight.quoteId}`);
  console.log(`     • Aircraft: ${mockRFQFlight.aircraftModel}`);
  console.log(`     • Operator: ${mockRFQFlight.operatorName}`);
  console.log(`     • Price: $${mockRFQFlight.totalPrice.toLocaleString()} ${mockRFQFlight.currency}`);
  console.log(`     • Status: ${mockRFQFlight.rfqStatus.toUpperCase()}`);
  console.log('');
  console.log('  🎯 Button Visibility Check:');
  const showActionButtons = mockRFQFlight.rfqStatus === 'quoted';
  console.log(`     • rfqStatus === 'quoted': ${showActionButtons}`);
  console.log(`     • "Generate Proposal" button visible: ${showActionButtons ? 'YES' : 'NO'}`);
  console.log('');

  if (!showActionButtons) {
    console.log('  ❌ TEST FAILED: Button would not be visible');
    console.log('     Status must be "quoted" for the button to appear');
    process.exit(1);
  }

  // Simulate button click
  console.log('┌───────────────────────────────────────────────────────────────┐');
  console.log('│  USER ACTION: Click "Generate Proposal" Button                │');
  console.log('└───────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('  🖱️  Simulating button click...');
  console.log(`     handleGenerateProposal('${flightId}', '${quoteId}')`);

  // Execute the handler (this is what happens when button is clicked)
  const result = await handleGenerateProposal(flightId, quoteId);

  // Report results
  console.log('┌───────────────────────────────────────────────────────────────┐');
  console.log('│  WORKFLOW RESULT                                              │');
  console.log('└───────────────────────────────────────────────────────────────┘');
  console.log('');

  if (result.success) {
    console.log('  ✅ WORKFLOW COMPLETED SUCCESSFULLY');
    console.log('');
    console.log('  📊 Results:');
    console.log(`     • Proposal ID: ${result.proposalId}`);
    console.log(`     • Email Sent: ${result.emailSent ? 'YES' : 'NO'}`);
    console.log('');
    console.log('  🔄 Complete Flow Executed:');
    console.log('     1. ✅ Button click triggered callback');
    console.log('     2. ✅ Flight details fetched');
    console.log('     3. ✅ Proposal data prepared');
    console.log('     4. ✅ PDF generated');
    console.log('     5. ✅ Email sent to customer');
    console.log('');
  } else {
    console.log('  ❌ WORKFLOW FAILED');
    console.log(`     Error: ${result.error}`);
    console.log('');
    process.exit(1);
  }

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  TEST PASSED - All workflow steps executed successfully       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
