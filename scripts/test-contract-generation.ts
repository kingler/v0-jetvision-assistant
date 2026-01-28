/**
 * Test Contract Generation for Trip BAP6QE - Challenger 600/601
 *
 * This script tests the contract generation functionality with sample data
 * based on the trip: KORD → KMCI, May 3, 2026, 4 passengers
 */

import { generateContract, calculateContractPricing } from '../lib/pdf/contract-generator';
import type { GenerateContractInput } from '../lib/types/contract';
import * as fs from 'fs';
import * as path from 'path';

async function testContractGeneration() {
  console.log('=== Contract Generation Test ===');
  console.log('Trip ID: BAP6QE');
  console.log('Aircraft: Challenger 600/601');
  console.log('Route: KORD → KMCI');
  console.log('Date: May 3, 2026');
  console.log('Passengers: 4\n');

  // Test data based on trip BAP6QE
  const contractInput: GenerateContractInput = {
    requestId: 'fcef5575-cc30-491b-8d62-2957a0c6d9a9', // Actual request ID from DB
    isoAgentId: 'e26aacb7-da3b-4013-91f9-16e76472f82b', // Actual ISO agent ID from DB

    // Sample customer data (no client profile exists yet)
    customer: {
      name: 'John Smith',
      email: 'john.smith@example.com',
      company: 'Acme Corporation',
      phone: '+1 (312) 555-0100',
    },

    // Flight details from the request
    flightDetails: {
      departureAirport: {
        icao: 'KORD',
        name: "Chicago O'Hare International Airport",
        city: 'Chicago',
      },
      arrivalAirport: {
        icao: 'KMCI',
        name: 'Kansas City International Airport',
        city: 'Kansas City',
      },
      departureDate: '2026-05-03',
      departureTime: '09:00',
      aircraftType: 'Heavy Jet',
      aircraftModel: 'Challenger 600/601',
      tailNumber: 'N601CL',
      passengers: 4,
      flightDuration: '1h 15m',
      distanceNm: 403,
    },

    // Sample pricing for Challenger 600/601
    // Typical rates: ~$4,500-$6,000/hour, flight time ~1.25 hours
    // Use calculateContractPricing to compute taxes and fees
    pricing: calculateContractPricing(
      18500.00,  // Base flight cost
      4,         // Passengers
      1,         // Segments (one-way flight)
      5          // Credit card fee percentage
    ),

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
    saveDraft: false, // Don't save to DB during test
  };

  try {
    console.log('Generating contract...\n');

    const result = await generateContract(contractInput);

    console.log('=== Contract Generated Successfully ===');
    console.log(`Contract ID: ${result.contractId || 'N/A (not saved)'}`);
    console.log(`Contract Number: ${result.contractNumber || 'N/A (not saved)'}`);
    console.log(`File Name: ${result.fileName}`);
    console.log(`Generated At: ${result.generatedAt}`);
    console.log('\n=== Calculated Pricing ===');
    console.log(`Flight Cost: $${result.pricing.flightCost.toLocaleString()}`);
    console.log(`Federal Excise Tax (7.5%): $${result.pricing.federalExciseTax.toLocaleString()}`);
    console.log(`Domestic Segment Fee: $${result.pricing.domesticSegmentFee.toLocaleString()}`);
    console.log(`Subtotal: $${result.pricing.subtotal.toLocaleString()}`);
    console.log(`Total Amount: $${result.pricing.totalAmount.toLocaleString()}`);

    // Save PDF to a test file
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, result.fileName);
    fs.writeFileSync(outputPath, result.pdfBuffer);

    console.log(`\n=== PDF Saved ===`);
    console.log(`Location: ${outputPath}`);
    console.log(`Size: ${(result.pdfBuffer.length / 1024).toFixed(2)} KB`);

    // Also save base64 for debugging
    const base64Path = path.join(outputDir, `${result.fileName}.base64.txt`);
    fs.writeFileSync(base64Path, result.pdfBase64);
    console.log(`Base64: ${base64Path}`);

    console.log('\n✅ Contract generation test completed successfully!');
    console.log(`\nOpen the PDF to verify: open "${outputPath}"`);

  } catch (error) {
    console.error('\n❌ Contract generation failed:');
    console.error(error);
    process.exit(1);
  }
}

testContractGeneration();
