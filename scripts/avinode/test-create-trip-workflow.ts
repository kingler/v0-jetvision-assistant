/**
 * Test Script: create_trip Workflow Debug
 *
 * Tests the create_trip tool call flow directly to identify
 * why the deep link is not being returned.
 */

import { AvinodeMCPServer } from '../../lib/mcp/avinode-server';

async function testCreateTripWorkflow() {
  console.log('=== Testing create_trip Workflow ===\n');

  // Initialize MCP server
  const mcp = new AvinodeMCPServer();
  console.log(`Mock mode: ${mcp.isUsingMockMode()}\n`);

  // Test 1: Direct createTrip call
  console.log('--- Test 1: Direct create_trip tool call ---');
  try {
    const tripResult = await mcp.callTool('create_trip', {
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      departure_date: '2025-01-25',
      passengers: 4,
    });

    console.log('create_trip result:');
    console.log(JSON.stringify(tripResult, null, 2));

    // Verify required fields
    if (tripResult.trip_id && tripResult.deep_link) {
      console.log('\n✅ SUCCESS: trip_id and deep_link are present');
      console.log(`   trip_id: ${tripResult.trip_id}`);
      console.log(`   deep_link: ${tripResult.deep_link}`);
    } else {
      console.log('\n❌ FAILURE: Missing trip_id or deep_link');
      console.log('   trip_id:', tripResult.trip_id || 'MISSING');
      console.log('   deep_link:', tripResult.deep_link || 'MISSING');
    }
  } catch (error) {
    console.error('Error calling create_trip:', error);
  }

  // Test 2: Flight detection regex patterns
  console.log('\n--- Test 2: Flight Detection Patterns ---');
  const testMessages = [
    'I need a flight from KTEB to KVNY for 4 passengers on January 25',
    'Book a charter from Teterboro to Van Nuys for 6 people next Tuesday',
    'Can you find me a jet from New York to Los Angeles for 8 passengers on 2025-01-30',
    'KTEB to KOPF 4 pax 2025-02-15',
    'Hello, how are you?', // Should NOT match
  ];

  for (const message of testMessages) {
    const messageText = message.toLowerCase();

    // Replicate detection logic from route.ts
    const hasAirportCode = /\b[a-z]{4}\b/i.test(message) ||
      messageText.includes('teterboro') ||
      messageText.includes('van nuys') ||
      messageText.includes('los angeles') ||
      messageText.includes('new york') ||
      messageText.includes('jfk') ||
      messageText.includes('lax');

    const hasPassengers = messageText.includes('passenger') ||
      /\d+\s*(pax|people|person|guests?)/i.test(message);

    const hasDate = messageText.includes('202') ||
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(message) ||
      /\d{1,2}[\/\-]\d{1,2}/.test(message) ||
      messageText.includes('tomorrow') ||
      messageText.includes('next week') ||
      messageText.includes('next tuesday');

    const hasFlightKeywords = messageText.includes('flight') ||
      messageText.includes('charter') ||
      messageText.includes('jet') ||
      messageText.includes('fly') ||
      messageText.includes('travel');

    const hasFlightDetails = hasAirportCode && hasPassengers && (hasDate || hasFlightKeywords);

    console.log(`\nMessage: "${message}"`);
    console.log(`  hasAirportCode: ${hasAirportCode}`);
    console.log(`  hasPassengers: ${hasPassengers}`);
    console.log(`  hasDate: ${hasDate}`);
    console.log(`  hasFlightKeywords: ${hasFlightKeywords}`);
    console.log(`  → hasFlightDetails: ${hasFlightDetails}`);
    console.log(`  → toolChoice would be: ${hasFlightDetails ? 'required' : 'auto'}`);
  }

  // Test 3: Verify response format matches frontend expectations
  console.log('\n--- Test 3: Verify Response Format ---');
  try {
    const tripResult = await mcp.callTool('create_trip', {
      departure_airport: 'KTEB',
      arrival_airport: 'KOPF',
      departure_date: '2025-01-28',
      passengers: 6,
    });

    // Check structure expected by chat-interface.tsx
    const expectedFields = [
      'trip_id',
      'deep_link',
      'departure_airport',
      'arrival_airport',
      'passengers',
    ];

    console.log('Checking response structure for frontend compatibility:');
    for (const field of expectedFields) {
      const value = tripResult[field];
      if (value !== undefined) {
        console.log(`  ✅ ${field}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      } else {
        console.log(`  ❌ ${field}: MISSING`);
      }
    }

    // Verify deep_link format
    if (tripResult.deep_link) {
      const isValidUrl = tripResult.deep_link.startsWith('https://');
      console.log(`\nDeep link format valid: ${isValidUrl ? '✅' : '❌'}`);
      console.log(`Deep link: ${tripResult.deep_link}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n=== Test Complete ===');
}

// Run tests
testCreateTripWorkflow().catch(console.error);
