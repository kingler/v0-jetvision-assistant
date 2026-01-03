#!/usr/bin/env npx tsx
/**
 * Avinode Complete Workflow Test Script
 *
 * Tests the complete deep link workflow using the Avinode MCP tools:
 * 1. create_trip - Create trip container with deep link
 * 2. Verify response format
 * 3. Test message functionality (send_trip_message, get_trip_messages)
 * 4. Test RFQ retrieval (get_rfq)
 *
 * Usage: npx tsx scripts/test-avinode-complete-workflow.ts
 */

import { AvinodeMCPServer } from '../lib/mcp/avinode-server';

// Test configuration
const TEST_CONFIG = {
  departure_airport: 'KTEB',  // Teterboro
  arrival_airport: 'KLAX',    // Los Angeles
  departure_date: '2025-01-25',
  departure_time: '10:00',
  passengers: 6,
  aircraft_category: 'heavy' as const,
  special_requirements: 'Catering requested, WiFi required',
  client_reference: 'TEST-WORKFLOW-001',
};

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  data?: unknown;
  error?: string;
}

async function runTest<T>(
  name: string,
  testFn: () => Promise<T>
): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const data = await testFn();
    const duration = Date.now() - startTime;
    logSuccess(`${name} (${duration}ms)`);
    return { name, passed: true, duration, data };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`${name}: ${errorMessage}`);
    return { name, passed: false, duration, error: errorMessage };
  }
}

async function main() {
  log('\n🚀 Avinode Complete Workflow Test', 'bright');
  log('Testing the human-in-the-loop deep link workflow\n', 'cyan');

  // Initialize MCP server
  const mcp = new AvinodeMCPServer();
  const isMockMode = mcp.isUsingMockMode();

  logInfo(`MCP Server Mode: ${isMockMode ? 'MOCK' : 'LIVE API'}`);
  logInfo(`Test Flight: ${TEST_CONFIG.departure_airport} → ${TEST_CONFIG.arrival_airport}`);
  logInfo(`Date: ${TEST_CONFIG.departure_date} at ${TEST_CONFIG.departure_time}`);
  logInfo(`Passengers: ${TEST_CONFIG.passengers}`);

  const results: TestResult[] = [];
  let tripId: string | null = null;
  let rfpId: string | null = null;

  // ============================================================
  // TEST 1: Create Trip (Primary workflow)
  // ============================================================
  logSection('TEST 1: Create Trip Container');

  const createTripResult = await runTest('create_trip', async () => {
    const result = await mcp.callTool('create_trip', {
      departure_airport: TEST_CONFIG.departure_airport,
      arrival_airport: TEST_CONFIG.arrival_airport,
      departure_date: TEST_CONFIG.departure_date,
      departure_time: TEST_CONFIG.departure_time,
      passengers: TEST_CONFIG.passengers,
      aircraft_category: TEST_CONFIG.aircraft_category,
      special_requirements: TEST_CONFIG.special_requirements,
      client_reference: TEST_CONFIG.client_reference,
    });

    // Validate response format
    if (!result.trip_id) {
      throw new Error('Response missing trip_id');
    }
    if (!result.deep_link) {
      throw new Error('Response missing deep_link');
    }
    if (!result.search_link) {
      throw new Error('Response missing search_link');
    }
    if (!result.status) {
      throw new Error('Response missing status');
    }

    // Store for later tests
    tripId = result.trip_id;

    return result;
  });

  results.push(createTripResult);

  if (createTripResult.passed && createTripResult.data) {
    const data = createTripResult.data as {
      trip_id: string;
      deep_link: string;
      search_link: string;
      status: string;
      created_at: string;
      route: {
        departure: { airport: string; date: string; time?: string };
        arrival: { airport: string };
      };
      passengers: number;
      departure_airport: { icao: string; name: string; city: string };
      arrival_airport: { icao: string; name: string; city: string };
    };

    console.log('\n📋 Trip Details:');
    console.log(`   Trip ID: ${data.trip_id}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Deep Link: ${data.deep_link}`);
    console.log(`   Search Link: ${data.search_link}`);
    console.log(`   Created At: ${data.created_at}`);

    if (data.route) {
      console.log('\n🛫 Route Details:');
      console.log(`   Departure: ${data.route.departure.airport} on ${data.route.departure.date}`);
      if (data.route.departure.time) {
        console.log(`   Time: ${data.route.departure.time}`);
      }
      console.log(`   Arrival: ${data.route.arrival.airport}`);
    }

    if (data.departure_airport && data.arrival_airport) {
      console.log('\n✈️  Airport Information:');
      console.log(`   From: ${data.departure_airport.name} (${data.departure_airport.icao})`);
      console.log(`         ${data.departure_airport.city}`);
      console.log(`   To:   ${data.arrival_airport.name} (${data.arrival_airport.icao})`);
      console.log(`         ${data.arrival_airport.city}`);
    }

    console.log(`\n👥 Passengers: ${data.passengers}`);
  }

  // ============================================================
  // TEST 2: Verify Response Format
  // ============================================================
  logSection('TEST 2: Verify Response Format');

  const verifyFormatResult = await runTest('verify_response_format', async () => {
    if (!createTripResult.data) {
      throw new Error('No trip data to verify');
    }

    const data = createTripResult.data as Record<string, unknown>;
    const requiredFields = ['trip_id', 'deep_link', 'search_link', 'status', 'created_at', 'passengers'];
    const missingFields = requiredFields.filter(field => !(field in data));

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Verify trip_id format (atrip-XXXXXXXX)
    const tripIdPattern = /^atrip-\d+$/;
    if (!tripIdPattern.test(data.trip_id as string)) {
      logWarning(`Trip ID format unexpected: ${data.trip_id} (expected atrip-XXXXXXXX)`);
    }

    // Verify deep_link is a valid URL
    try {
      new URL(data.deep_link as string);
    } catch {
      throw new Error(`Invalid deep_link URL: ${data.deep_link}`);
    }

    // Verify search_link is a valid URL
    try {
      new URL(data.search_link as string);
    } catch {
      throw new Error(`Invalid search_link URL: ${data.search_link}`);
    }

    // Verify status is expected
    const validStatuses = ['created', 'pending', 'active'];
    if (!validStatuses.includes(data.status as string)) {
      logWarning(`Unexpected status: ${data.status}`);
    }

    return { verified: true, fieldsChecked: requiredFields.length };
  });

  results.push(verifyFormatResult);

  // ============================================================
  // TEST 3: Search Flights
  // ============================================================
  logSection('TEST 3: Search Available Flights');

  const searchFlightsResult = await runTest('search_flights', async () => {
    const result = await mcp.callTool('search_flights', {
      departure_airport: TEST_CONFIG.departure_airport,
      arrival_airport: TEST_CONFIG.arrival_airport,
      departure_date: TEST_CONFIG.departure_date,
      passengers: TEST_CONFIG.passengers,
      aircraft_category: TEST_CONFIG.aircraft_category,
    });

    if (!result.aircraft || !Array.isArray(result.aircraft)) {
      throw new Error('Response missing aircraft array');
    }

    return result;
  });

  results.push(searchFlightsResult);

  if (searchFlightsResult.passed && searchFlightsResult.data) {
    const data = searchFlightsResult.data as {
      search_id: string;
      aircraft: Array<{
        id: string;
        type: string;
        model: string;
        category: string;
        capacity: number;
        operator: { id: string; name: string; rating: number };
        estimatedPrice: { amount: number; currency: string };
      }>;
      total: number;
    };

    console.log(`\n🔍 Search Results (${data.total} aircraft found):`);
    data.aircraft.forEach((aircraft, i) => {
      console.log(`\n   ${i + 1}. ${aircraft.model} (${aircraft.type})`);
      console.log(`      Category: ${aircraft.category}`);
      console.log(`      Capacity: ${aircraft.capacity} passengers`);
      console.log(`      Operator: ${aircraft.operator.name} (Rating: ${aircraft.operator.rating})`);
      console.log(`      Estimated: ${aircraft.estimatedPrice.currency} ${aircraft.estimatedPrice.amount.toLocaleString()}`);
    });
  }

  // ============================================================
  // TEST 4: Create RFP
  // ============================================================
  logSection('TEST 4: Create RFP');

  const createRfpResult = await runTest('create_rfp', async () => {
    const result = await mcp.callTool('create_rfp', {
      flight_details: {
        departure_airport: TEST_CONFIG.departure_airport,
        arrival_airport: TEST_CONFIG.arrival_airport,
        departure_date: TEST_CONFIG.departure_date,
        passengers: TEST_CONFIG.passengers,
      },
      operator_ids: ['comp-exec-jet-001', 'comp-netjets-002', 'comp-vistajet-003'],
      special_requirements: TEST_CONFIG.special_requirements,
    });

    if (!result.request_id && !result.rfp_id) {
      throw new Error('Response missing request_id/rfp_id');
    }

    rfpId = result.request_id || result.rfp_id;
    return result;
  });

  results.push(createRfpResult);

  if (createRfpResult.passed && createRfpResult.data) {
    const data = createRfpResult.data as {
      trip_id: string;
      request_id: string;
      rfp_id: string;
      status: string;
      operators_notified: number;
      deep_link: string;
      quote_deadline: string;
    };

    console.log('\n📨 RFP Details:');
    console.log(`   Trip ID: ${data.trip_id}`);
    console.log(`   Request ID: ${data.request_id || data.rfp_id}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Operators Notified: ${data.operators_notified}`);
    console.log(`   Quote Deadline: ${data.quote_deadline}`);
    console.log(`   Deep Link: ${data.deep_link}`);
  }

  // ============================================================
  // TEST 5: Get Quote Status
  // ============================================================
  logSection('TEST 5: Get Quote Status');

  const getQuoteStatusResult = await runTest('get_quote_status', async () => {
    if (!tripId) {
      throw new Error('No trip_id available from previous test');
    }

    const result = await mcp.callTool('get_quote_status', {
      rfp_id: tripId,
    });

    return result;
  });

  results.push(getQuoteStatusResult);

  if (getQuoteStatusResult.passed && getQuoteStatusResult.data) {
    const data = getQuoteStatusResult.data as {
      trip_id: string;
      request_id: string;
      status: string;
      operators_contacted: number;
      quotes_received: number;
      quote_deadline: string;
    };

    console.log('\n📊 Quote Status:');
    console.log(`   Status: ${data.status}`);
    console.log(`   Operators Contacted: ${data.operators_contacted}`);
    console.log(`   Quotes Received: ${data.quotes_received}`);
    console.log(`   Deadline: ${data.quote_deadline}`);
  }

  // ============================================================
  // TEST 6: Get Quotes
  // ============================================================
  logSection('TEST 6: Get All Quotes');

  const getQuotesResult = await runTest('get_quotes', async () => {
    if (!tripId) {
      throw new Error('No trip_id available from previous test');
    }

    const result = await mcp.callTool('get_quotes', {
      rfp_id: tripId,
    });

    if (!result.quotes || !Array.isArray(result.quotes)) {
      throw new Error('Response missing quotes array');
    }

    return result;
  });

  results.push(getQuotesResult);

  if (getQuotesResult.passed && getQuotesResult.data) {
    const data = getQuotesResult.data as {
      quotes: Array<{
        id: string;
        operator_name: string;
        aircraft_type: string;
        total_price: number;
        status: string;
        valid_until: string;
        score?: number;
        ranking?: number;
        aircraft_details?: {
          model: string;
          capacity: number;
        };
      }>;
      total: number;
    };

    console.log(`\n💰 Quotes Received (${data.total}):`);
    data.quotes.forEach((quote, i) => {
      console.log(`\n   ${i + 1}. Quote from ${quote.operator_name}`);
      console.log(`      ID: ${quote.id}`);
      console.log(`      Aircraft: ${quote.aircraft_type}`);
      if (quote.aircraft_details) {
        console.log(`      Model: ${quote.aircraft_details.model}`);
        console.log(`      Capacity: ${quote.aircraft_details.capacity} passengers`);
      }
      console.log(`      Price: $${quote.total_price.toLocaleString()}`);
      console.log(`      Status: ${quote.status}`);
      if (quote.score !== undefined) {
        console.log(`      Score: ${quote.score}`);
      }
      if (quote.ranking !== undefined) {
        console.log(`      Ranking: #${quote.ranking}`);
      }
      console.log(`      Valid Until: ${quote.valid_until}`);
    });
  }

  // ============================================================
  // TEST 7: Search Airports
  // ============================================================
  logSection('TEST 7: Search Airports');

  const searchAirportsResult = await runTest('search_airports', async () => {
    const result = await mcp.callTool('search_airports', {
      query: 'Los Angeles',
      country: 'US',
    });

    return result;
  });

  results.push(searchAirportsResult);

  if (searchAirportsResult.passed && searchAirportsResult.data) {
    const data = searchAirportsResult.data as {
      airports: Array<{
        icao: string;
        iata: string;
        name: string;
        city: string;
        country: string;
      }>;
      total: number;
    };

    console.log(`\n🏢 Airports Found (${data.total}):`);
    data.airports.forEach((airport) => {
      console.log(`   ${airport.icao} (${airport.iata}) - ${airport.name}, ${airport.city}`);
    });
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  logSection('TEST SUMMARY');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n📊 Results:`);
  log(`   ✅ Passed: ${passed}`, 'green');
  if (failed > 0) {
    log(`   ❌ Failed: ${failed}`, 'red');
  }
  console.log(`   ⏱️  Total Duration: ${totalDuration}ms`);

  console.log('\n📋 Individual Results:');
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`   ${icon} ${result.name}: ${status} (${result.duration}ms)`);
    if (!result.passed && result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });

  // Show next steps
  if (tripId) {
    console.log('\n🔗 Next Steps (Human-in-the-Loop):');
    console.log('   1. Open the deep link in a browser to access Avinode marketplace');
    console.log('   2. Select aircraft operators to request quotes');
    console.log('   3. Wait for operators to respond (10-30 minutes)');
    console.log('   4. Return with the Trip ID to retrieve quotes');
    console.log(`\n   Your Trip ID: ${tripId}`);

    if (createTripResult.data) {
      const data = createTripResult.data as { deep_link: string };
      console.log(`   Deep Link: ${data.deep_link}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  log(failed === 0 ? '  ✅ ALL TESTS PASSED!' : `  ⚠️  ${failed} TEST(S) FAILED`, failed === 0 ? 'green' : 'red');
  console.log('='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
