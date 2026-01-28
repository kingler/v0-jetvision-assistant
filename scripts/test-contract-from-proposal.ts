/**
 * Test Contract Generation from Proposal Data
 *
 * Based on the proposal sent for Trip BAP6QE:
 * - Client: Willy Becy (kingler@me.com)
 * - Total: $56,225 USD
 * - Route: KORD → KMCI
 * - Date: May 3, 2026
 * - Aircraft: Challenger 600/601
 */

import { generateContract, calculateContractPricing } from '../lib/pdf/contract-generator';
import type { GenerateContractInput } from '../lib/types/contract';
import * as fs from 'fs';
import * as path from 'path';

// Proposal data extracted from the database
const PROPOSAL_DATA = {
  proposalId: 'JV-MKYCX2GL-1MD8',
  client: {
    name: 'Willy Becy',
    email: 'kingler@me.com',
  },
  pricing: {
    total: 56225,
    currency: 'USD',
  },
  flightDetails: {
    departureDate: '2026-05-03',
    arrivalAirport: 'KMCI',
    departureAirport: 'KORD',
  },
  pdfUrl: 'https://sbzaevawnjlrsjsuevli.supabase.co/storage/v1/object/public/proposals/e26aacb7-da3b-4013-91f9-16e76472f82b/1769624805407_Jetvision_Proposal_KORD_KMCI_20260503_JV-MKYCX2GL-1MD8.pdf',
};

// Request data from database
const REQUEST_DATA = {
  id: 'fcef5575-cc30-491b-8d62-2957a0c6d9a9',
  avinode_trip_id: 'BAP6QE',
  departure_airport: 'KORD',
  arrival_airport: 'KMCI',
  departure_date: '2026-05-03',
  passengers: 4,
  iso_agent_id: 'e26aacb7-da3b-4013-91f9-16e76472f82b',
};

async function testContractFromProposal() {
  console.log('=== Contract Generation from Proposal ===');
  console.log('Trip ID: BAP6QE');
  console.log('Proposal ID:', PROPOSAL_DATA.proposalId);
  console.log('Client:', PROPOSAL_DATA.client.name, '<' + PROPOSAL_DATA.client.email + '>');
  console.log('Route:', REQUEST_DATA.departure_airport, '→', REQUEST_DATA.arrival_airport);
  console.log('Date:', REQUEST_DATA.departure_date);
  console.log('Passengers:', REQUEST_DATA.passengers);
  console.log('Proposal Total:', '$' + PROPOSAL_DATA.pricing.total.toLocaleString());
  console.log('');

  // Back-calculate flight cost from proposal total
  // Proposal total = flight cost + FET (7.5%) + segment fee ($5.20 * pax * segments)
  // Total = FC + (FC * 0.075) + (5.20 * 4 * 1)
  // Total = FC * 1.075 + 20.80
  // FC = (Total - 20.80) / 1.075
  const segmentFee = 5.20 * REQUEST_DATA.passengers * 1;
  const flightCost = Math.round((PROPOSAL_DATA.pricing.total - segmentFee) / 1.075 * 100) / 100;

  console.log('Back-calculated flight cost:', '$' + flightCost.toLocaleString());

  // Calculate full pricing breakdown
  const pricing = calculateContractPricing(
    flightCost,
    REQUEST_DATA.passengers,
    1, // segments
    5  // CC fee percentage
  );

  console.log('\n=== Pricing Breakdown ===');
  console.log('Flight Cost:', '$' + pricing.flightCost.toLocaleString());
  console.log('Federal Excise Tax (7.5%):', '$' + pricing.federalExciseTax.toLocaleString());
  console.log('Domestic Segment Fee:', '$' + pricing.domesticSegmentFee.toLocaleString());
  console.log('Subtotal:', '$' + pricing.subtotal.toLocaleString());
  console.log('Total Amount:', '$' + pricing.totalAmount.toLocaleString());
  console.log('');

  // Generate contract
  const contractInput: GenerateContractInput = {
    requestId: REQUEST_DATA.id,
    isoAgentId: REQUEST_DATA.iso_agent_id,
    proposalId: PROPOSAL_DATA.proposalId,
    referenceQuoteNumber: PROPOSAL_DATA.proposalId,

    customer: {
      name: PROPOSAL_DATA.client.name,
      email: PROPOSAL_DATA.client.email,
      company: '', // Not provided in proposal
      phone: '',   // Not provided in proposal
    },

    flightDetails: {
      departureAirport: {
        icao: REQUEST_DATA.departure_airport,
        name: "Chicago O'Hare International Airport",
        city: 'Chicago',
      },
      arrivalAirport: {
        icao: REQUEST_DATA.arrival_airport,
        name: 'Kansas City International Airport',
        city: 'Kansas City',
      },
      departureDate: REQUEST_DATA.departure_date,
      departureTime: '09:00',
      aircraftType: 'Super-Mid Jet',
      aircraftModel: 'Challenger 600/601',
      tailNumber: 'N601CL',
      passengers: REQUEST_DATA.passengers,
      flightDuration: '1h 15m',
      distanceNm: 403, // KORD to KMCI distance
    },

    pricing: pricing,

    // Challenger 600/601 amenities
    amenities: {
      wifi: true,
      galley: true,
      flightAttendant: true,
      lavatory: true,
      pets: true,
      smoking: false,
      leatherSeats: true,
      airConditioning: true,
      medical: false,
    },

    paymentMethod: 'wire',
    saveDraft: false,
  };

  try {
    console.log('Generating contract...\n');

    const result = await generateContract(contractInput);

    console.log('=== Contract Generated Successfully ===');
    console.log('Contract ID:', result.contractId || 'N/A');
    console.log('Contract Number:', result.contractNumber || 'N/A');
    console.log('File Name:', result.fileName);
    console.log('Generated At:', result.generatedAt);

    console.log('\n=== Final Pricing ===');
    console.log('Flight Cost:', '$' + result.pricing.flightCost.toLocaleString());
    console.log('Federal Excise Tax (7.5%):', '$' + result.pricing.federalExciseTax.toLocaleString());
    console.log('Domestic Segment Fee:', '$' + result.pricing.domesticSegmentFee.toLocaleString());
    console.log('Subtotal:', '$' + result.pricing.subtotal.toLocaleString());
    console.log('Total Amount:', '$' + result.pricing.totalAmount.toLocaleString());

    // Verify total matches proposal
    const diff = Math.abs(result.pricing.totalAmount - PROPOSAL_DATA.pricing.total);
    console.log('\n=== Verification ===');
    console.log('Proposal Total:', '$' + PROPOSAL_DATA.pricing.total.toLocaleString());
    console.log('Contract Total:', '$' + result.pricing.totalAmount.toLocaleString());
    console.log('Difference:', '$' + diff.toFixed(2), diff < 1 ? '✓ Match' : '⚠ Mismatch');

    // Save PDF
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, result.fileName);
    fs.writeFileSync(outputPath, result.pdfBuffer);

    console.log('\n=== PDF Saved ===');
    console.log('Location:', outputPath);
    console.log('Size:', (result.pdfBuffer.length / 1024).toFixed(2), 'KB');

    console.log('\n✅ Contract generation from proposal completed successfully!');
    console.log('\nOpen the PDF to verify:', `open "${outputPath}"`);

    // Open PDF automatically
    const { exec } = await import('child_process');
    exec(`open "${outputPath}"`);

  } catch (error) {
    console.error('\n❌ Contract generation failed:');
    console.error(error);
    process.exit(1);
  }
}

testContractFromProposal();
