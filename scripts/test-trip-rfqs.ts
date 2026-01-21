#!/usr/bin/env tsx

/**
 * Test Script: Check TripIDs with RFQs and Operator Messages
 * 
 * This script queries the database to find:
 * 1. Trip IDs that have RFQs (quotes)
 * 2. Trip IDs that have operator messages
 * 3. Detailed information about each trip's RFQ and message status
 * 
 * Usage:
 *   pnpm tsx scripts/test-trip-rfqs.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface TripRFQStatus {
  tripId: string
  requestId: string
  route: string
  status: string
  rfqCount: number
  quoteCount: number
  operatorMessageCount: number
  webhookEventCount: number
  quotes: Array<{
    id: string
    operatorName: string
    totalPrice: number
    status: string
    hasMessage: boolean
  }>
  messages: Array<{
    id: string
    senderType: string
    content: string
    createdAt: string
  }>
  webhookEvents: Array<{
    eventType: string
    receivedAt: string
  }>
}

/**
 * Main function to test TripIDs with RFQs and operator messages
 */
async function testTripRFQs() {
  console.log('🔍 Testing TripIDs with RFQs and Operator Messages...\n')
  console.log(`Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  console.log(`Service Key: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}\n`)

  // Test connection first
  try {
    const { data: testData, error: testError } = await supabase
      .from('requests')
      .select('id')
      .limit(1)
    
    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`)
    }
    console.log('✅ Database connection successful\n')
  } catch (error) {
    console.error('❌ Database connection test failed:', error)
    throw error
  }

  try {
    // Step 1: Get all requests with trip IDs
    console.log('📋 Step 1: Fetching requests with trip IDs...')
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .select('id, avinode_trip_id, departure_airport, arrival_airport, status, created_at')
      .not('avinode_trip_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (requestsError) {
      throw new Error(`Failed to fetch requests: ${requestsError.message}`)
    }

    console.log(`✅ Found ${requests?.length || 0} requests with trip IDs\n`)

    if (!requests || requests.length === 0) {
      console.log('⚠️  No requests with trip IDs found in database')
      return
    }

    // Step 2: For each request, get RFQs, quotes, and messages
    console.log('📊 Step 2: Analyzing RFQs, quotes, and messages for each trip...\n')

    const tripStatuses: TripRFQStatus[] = []

    for (const request of requests) {
      const tripId = request.avinode_trip_id as string
      const route = `${request.departure_airport} → ${request.arrival_airport}`

      // Get quotes for this request
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, operator_name, total_price, status, message_content, avinode_quote_id, created_at')
        .eq('request_id', request.id)
        .order('created_at', { ascending: false })

      if (quotesError) {
        console.error(`❌ Error fetching quotes for trip ${tripId}:`, quotesError.message)
        continue
      }

      // Get operator messages for this request (messages from operators)
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, sender_type, content, created_at, quote_id')
        .eq('request_id', request.id)
        .eq('sender_type', 'operator')
        .order('created_at', { ascending: false })

      if (messagesError) {
        console.error(`❌ Error fetching messages for trip ${tripId}:`, messagesError.message)
        continue
      }

      // Get webhook events for this trip
      const { data: webhookEvents, error: webhookError } = await supabase
        .from('avinode_webhook_events')
        .select('event_type, received_at, quote_id')
        .eq('avinode_trip_id', tripId)
        .order('received_at', { ascending: false })

      if (webhookError) {
        console.error(`❌ Error fetching webhook events for trip ${tripId}:`, webhookError.message)
        continue
      }

      // Count RFQs (webhook events of type TripRequestSellerResponse)
      const rfqEvents = webhookEvents?.filter(e => e.event_type === 'TripRequestSellerResponse') || []
      const operatorMessageEvents = webhookEvents?.filter(e => 
        e.event_type === 'TripChatSeller' || e.event_type === 'TripChatMine'
      ) || []

      // Build quote details with message status
      const quoteDetails = (quotes || []).map(quote => ({
        id: quote.id,
        operatorName: quote.operator_name || 'Unknown',
        totalPrice: quote.total_price || 0,
        status: quote.status || 'unknown',
        hasMessage: !!quote.message_content,
        avinodeQuoteId: quote.avinode_quote_id,
      }))

      // Build message details
      const messageDetails = (messages || []).map(msg => ({
        id: msg.id,
        senderType: msg.sender_type,
        content: (msg.content || '').substring(0, 100) + (msg.content && msg.content.length > 100 ? '...' : ''),
        createdAt: msg.created_at,
        quoteId: msg.quote_id,
      }))

      // Build webhook event details
      const webhookEventDetails = (webhookEvents || []).map(evt => ({
        eventType: evt.event_type,
        receivedAt: evt.received_at,
      }))

      tripStatuses.push({
        tripId,
        requestId: request.id,
        route,
        status: request.status || 'unknown',
        rfqCount: rfqEvents.length,
        quoteCount: quotes?.length || 0,
        operatorMessageCount: messages?.length || 0,
        webhookEventCount: webhookEvents?.length || 0,
        quotes: quoteDetails,
        messages: messageDetails,
        webhookEvents: webhookEventDetails,
      })
    }

    // Step 3: Display results
    console.log('='.repeat(80))
    console.log('📊 RESULTS: TripIDs with RFQs and Operator Messages')
    console.log('='.repeat(80))
    console.log()

    // Summary statistics
    const tripsWithRFQs = tripStatuses.filter(t => t.rfqCount > 0).length
    const tripsWithQuotes = tripStatuses.filter(t => t.quoteCount > 0).length
    const tripsWithMessages = tripStatuses.filter(t => t.operatorMessageCount > 0).length

    console.log('📈 Summary Statistics:')
    console.log(`   Total trips analyzed: ${tripStatuses.length}`)
    console.log(`   Trips with RFQs: ${tripsWithRFQs}`)
    console.log(`   Trips with quotes: ${tripsWithQuotes}`)
    console.log(`   Trips with operator messages: ${tripsWithMessages}`)
    console.log()

    // Detailed results for each trip
    console.log('📋 Detailed Trip Information:')
    console.log('='.repeat(80))

    tripStatuses.forEach((trip, index) => {
      console.log(`\n${index + 1}. Trip ID: ${trip.tripId}`)
      console.log(`   Request ID: ${trip.requestId}`)
      console.log(`   Route: ${trip.route}`)
      console.log(`   Status: ${trip.status}`)
      console.log(`   RFQs (webhook events): ${trip.rfqCount}`)
      console.log(`   Quotes in database: ${trip.quoteCount}`)
      console.log(`   Operator messages: ${trip.operatorMessageCount}`)
      console.log(`   Total webhook events: ${trip.webhookEventCount}`)

      if (trip.quotes.length > 0) {
        console.log(`\n   📦 Quotes:`)
        trip.quotes.forEach((quote, qIdx) => {
          console.log(`      ${qIdx + 1}. ${quote.operatorName}`)
          console.log(`         Price: $${quote.totalPrice.toLocaleString()}`)
          console.log(`         Status: ${quote.status}`)
          console.log(`         Has message: ${quote.hasMessage ? '✅' : '❌'}`)
          console.log(`         Avinode Quote ID: ${quote.avinodeQuoteId || 'N/A'}`)
        })
      }

      if (trip.messages.length > 0) {
        console.log(`\n   💬 Operator Messages (${trip.messages.length}):`)
        trip.messages.slice(0, 5).forEach((msg, mIdx) => {
          console.log(`      ${mIdx + 1}. [${msg.senderType}] ${msg.content}`)
          console.log(`         Created: ${new Date(msg.createdAt).toLocaleString()}`)
          if (msg.quoteId) {
            console.log(`         Quote ID: ${msg.quoteId}`)
          }
        })
        if (trip.messages.length > 5) {
          console.log(`      ... and ${trip.messages.length - 5} more messages`)
        }
      }

      if (trip.webhookEvents.length > 0) {
        console.log(`\n   🔔 Webhook Events (${trip.webhookEvents.length}):`)
        const eventTypes = trip.webhookEvents.reduce((acc, evt) => {
          acc[evt.eventType] = (acc[evt.eventType] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        Object.entries(eventTypes).forEach(([type, count]) => {
          console.log(`      ${type}: ${count}`)
        })
      }

      console.log(`\n${'-'.repeat(80)}`)
    })

    // Trips with RFQs but no quotes in database
    const tripsWithRFQsButNoQuotes = tripStatuses.filter(
      t => t.rfqCount > 0 && t.quoteCount === 0
    )

    if (tripsWithRFQsButNoQuotes.length > 0) {
      console.log('\n⚠️  Trips with RFQ webhook events but no quotes in database:')
      tripsWithRFQsButNoQuotes.forEach(trip => {
        console.log(`   - ${trip.tripId} (${trip.route}): ${trip.rfqCount} RFQs, 0 quotes`)
      })
    }

    // Trips with quotes but no operator messages
    const tripsWithQuotesButNoMessages = tripStatuses.filter(
      t => t.quoteCount > 0 && t.operatorMessageCount === 0
    )

    if (tripsWithQuotesButNoMessages.length > 0) {
      console.log('\n⚠️  Trips with quotes but no operator messages:')
      tripsWithQuotesButNoMessages.forEach(trip => {
        console.log(`   - ${trip.tripId} (${trip.route}): ${trip.quoteCount} quotes, 0 messages`)
      })
    }

    console.log('\n✅ Test completed successfully!')

  } catch (error) {
    console.error('\n❌ Error running test:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run the test
testTripRFQs()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed with error:')
    console.error(error)
    process.exit(1)
  })
