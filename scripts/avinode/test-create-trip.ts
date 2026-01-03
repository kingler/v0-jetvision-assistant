/**
 * Test create_trip tool for deep link generation
 *
 * This script tests that the create_trip MCP tool correctly generates a deep link.
 */

import { AvinodeMCPServer } from '../lib/mcp/avinode-server';

async function testCreateTrip() {
  console.log('\n=== Testing create_trip Tool ===\n');

  // Initialize MCP server
  const mcp = new AvinodeMCPServer();
  console.log(`Mock mode: ${mcp.isUsingMockMode()}`);

  // Test parameters
  const params = {
    departure_airport: 'KTEB',
    arrival_airport: 'KVNY',
    departure_date: '2025-01-20',
    passengers: 4,
  };

  console.log('\nCalling create_trip with:', params);

  try {
    const result = await mcp.callTool('create_trip', params);

    console.log('\n=== Result ===');
    console.log(JSON.stringify(result, null, 2));

    // Validate result
    if (result.trip_id) {
      console.log('\n✅ Trip ID:', result.trip_id);
    } else {
      console.log('\n❌ Missing trip_id');
    }

    if (result.deep_link) {
      console.log('✅ Deep Link:', result.deep_link);
    } else {
      console.log('❌ Missing deep_link');
    }

    if (result.departure_airport) {
      console.log('✅ Departure Airport:', JSON.stringify(result.departure_airport));
    }

    if (result.arrival_airport) {
      console.log('✅ Arrival Airport:', JSON.stringify(result.arrival_airport));
    }

    console.log('\n=== Test Complete ===\n');

    // Return success if deep_link is present
    process.exit(result.deep_link ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testCreateTrip();
