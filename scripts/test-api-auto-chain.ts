#!/usr/bin/env npx tsx
/**
 * Test that the Chat API auto-chains create_rfp after search_flights
 */

const API_URL = 'http://localhost:3000/api/chat';

async function testAutoChain() {
  console.log('\n========================================');
  console.log('Testing Chat API Auto-Chain: search_flights → create_rfp');
  console.log('========================================\n');

  const flightRequest = 'I need a private jet from Teterboro (KTEB) to Los Angeles (KLAX) for 6 passengers on January 25th, 2025';
  
  console.log(`Request: "${flightRequest}"\n`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: flightRequest,
        conversationHistory: [],
      }),
    });

    console.log(`Response Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('⚠️  Authentication required - testing without auth');
      console.log('   The API correctly requires authentication');
      return;
    }

    const text = await response.text();
    console.log('\nRaw Response:');
    console.log(text.substring(0, 500));
    
    // Parse SSE format
    const lines = text.split('\n').filter(line => line.startsWith('data: '));
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line.replace('data: ', ''));
        console.log('\n--- Parsed Response ---');
        console.log('Content:', data.content?.substring(0, 200) || 'N/A');
        console.log('Done:', data.done);
        console.log('Mock Mode:', data.mock_mode);
        
        if (data.tool_calls) {
          console.log('\n✅ Tool Calls:');
          for (const tc of data.tool_calls) {
            console.log(`  - ${tc.name}`);
            if (tc.result) {
              console.log(`    Result keys: ${Object.keys(tc.result).join(', ')}`);
              if (tc.result.deep_link) {
                console.log(`    🔗 Deep Link: ${tc.result.deep_link}`);
              }
              if (tc.result.trip_id) {
                console.log(`    📋 Trip ID: ${tc.result.trip_id}`);
              }
            }
          }
        }
        
        if (data.rfp_data) {
          console.log('\n✅ RFP Data Present:');
          console.log(`  - RFP ID: ${data.rfp_data.rfp_id}`);
          console.log(`  - Trip ID: ${data.rfp_data.trip_id}`);
          console.log(`  - Deep Link: ${data.rfp_data.deep_link}`);
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Check for auto-chaining success
    const hasSearchFlights = text.includes('search_flights');
    const hasCreateRfp = text.includes('create_rfp');
    const hasDeepLink = text.includes('deep_link');

    console.log('\n========================================');
    console.log('RESULTS:');
    console.log(`  search_flights called: ${hasSearchFlights ? '✅' : '❌'}`);
    console.log(`  create_rfp called: ${hasCreateRfp ? '✅' : '❌'}`);
    console.log(`  deep_link in response: ${hasDeepLink ? '✅' : '❌'}`);
    console.log('========================================\n');

    if (hasSearchFlights && hasCreateRfp && hasDeepLink) {
      console.log('🎉 SUCCESS: Auto-chaining is working!');
    } else if (!hasCreateRfp) {
      console.log('❌ FAIL: create_rfp was not auto-chained after search_flights');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testAutoChain();
