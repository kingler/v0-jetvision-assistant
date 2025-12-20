/**
 * Test Avinode Mock Client
 *
 * Tests the mock Avinode client directly to verify it works
 * without requiring real API credentials.
 *
 * Usage: npx tsx scripts/test-avinode-mock.ts
 */

import { MockAvinodeClient } from '../lib/mcp/clients/mock-avinode-client'

async function testAvinodeMock() {
  console.log('\n🛩️  Testing Avinode Mock Client\n')
  console.log('='.repeat(60))

  const client = new MockAvinodeClient()

  // Test 1: Search Flights
  console.log('\n✈️  Test 1: Search Flights (KTEB → KOPF)')
  console.log('-'.repeat(40))
  try {
    const result = await client.searchFlights({
      departure_airport: 'KTEB',
      arrival_airport: 'KOPF',
      passengers: 4,
      aircraft_category: 'light',
    })
    console.log(`Found ${result.total} aircraft:`)
    for (const aircraft of result.aircraft) {
      console.log(`   - ${aircraft.type} (${aircraft.category}) - ${aircraft.operator.name}`)
      console.log(`     Capacity: ${aircraft.capacity}, Range: ${aircraft.range}nm`)
    }
  } catch (error) {
    console.log('❌ Failed:', error)
  }

  // Test 2: Create RFP
  console.log('\n📝 Test 2: Create RFP')
  console.log('-'.repeat(40))
  let rfpId = ''
  try {
    const result = await client.createRFP({
      flight_details: {
        departure_airport: 'KTEB',
        arrival_airport: 'KOPF',
        departure_date: '2025-01-15',
        passengers: 4,
      },
      operator_ids: ['OP-001', 'OP-002', 'OP-003'],
    })
    rfpId = result.rfp_id
    console.log('RFP Created:')
    console.log(`   ID: ${result.rfp_id}`)
    console.log(`   Status: ${result.status}`)
    console.log(`   Operators Notified: ${result.operators_notified}`)
    console.log(`   Created: ${result.created_at}`)
  } catch (error) {
    console.log('❌ Failed:', error)
  }

  // Test 3: Get RFP Status
  console.log('\n📊 Test 3: Get RFP Status')
  console.log('-'.repeat(40))
  if (rfpId) {
    try {
      const result = await client.getQuoteStatus(rfpId)
      console.log('RFP Status:')
      console.log(`   ID: ${result.rfp_id}`)
      console.log(`   Total Operators: ${result.total_operators}`)
      console.log(`   Responded: ${result.responded}`)
      console.log(`   Pending: ${result.pending}`)
      console.log(`   Deadline: ${result.deadline}`)
    } catch (error) {
      console.log('❌ Failed:', error)
    }
  }

  // Test 4: Get Quotes
  console.log('\n💰 Test 4: Get Quotes')
  console.log('-'.repeat(40))
  if (rfpId) {
    try {
      const result = await client.getQuotes(rfpId)
      console.log(`Found ${result.total} quotes:`)
      for (const quote of result.quotes) {
        console.log(`\n   Quote ID: ${quote.quote_id}`)
        console.log(`   Operator: ${quote.operator_name}`)
        console.log(`   Aircraft: ${quote.aircraft_type}`)
        console.log(`   Price: $${quote.base_price.toLocaleString()}`)
        console.log(`   Response Time: ${quote.response_time} minutes`)
      }
    } catch (error) {
      console.log('❌ Failed:', error)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Mock client test complete!')
  console.log('\nThe mock client provides realistic test data without API credentials.')
  console.log('\nTo enable real Avinode API:')
  console.log('  1. Get API credentials from Avinode')
  console.log('  2. Set AVINODE_API_KEY in .env.local')
  console.log('  3. The MCP server will automatically use real API when key is present')
}

testAvinodeMock().catch(console.error)

export {}
