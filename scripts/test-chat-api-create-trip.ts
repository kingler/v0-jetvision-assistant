/**
 * Test Script: Chat API create_trip Integration
 *
 * Tests the full chat API flow to verify create_trip is being called
 * and the response includes trip_data with deep_link.
 */

import http from 'http';

const TEST_MESSAGE = 'I need a flight from KTEB to KVNY for 4 passengers on January 25, 2025';

async function testChatAPI() {
  console.log('=== Testing Chat API create_trip Integration ===\n');
  console.log(`Test message: "${TEST_MESSAGE}"\n`);

  // Build request
  const requestBody = JSON.stringify({
    message: TEST_MESSAGE,
    conversationHistory: [],
    context: {
      flightRequestId: 'test-123',
    },
  });

  console.log('Sending request to /api/chat...\n');

  try {
    // Use native fetch
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, authentication would be handled by Clerk
        // This test requires the server to be running and authenticated session
      },
      body: requestBody,
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }

    // Read SSE response
    const reader = response.body?.getReader();
    if (!reader) {
      console.log('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let tripData: any = null;
    let toolCalls: any[] = [];

    console.log('--- SSE Stream ---');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log('\nSSE Data:', JSON.stringify(data, null, 2));

            if (data.content) {
              fullContent += data.content;
            }

            if (data.tool_calls) {
              toolCalls = data.tool_calls;
            }

            if (data.trip_data) {
              tripData = data.trip_data;
            }

            if (data.done) {
              console.log('\n--- Stream Complete ---\n');
            }
          } catch (e) {
            console.log('Parse error for line:', line);
          }
        }
      }
    }

    // Analysis
    console.log('=== Analysis ===\n');

    console.log('Tool calls made:');
    if (toolCalls.length > 0) {
      for (const tc of toolCalls) {
        console.log(`  - ${tc.name}:`, tc.result ? '✅ Has result' : '❌ No result');
        if (tc.name === 'create_trip' && tc.result) {
          console.log('    trip_id:', tc.result.trip_id || 'MISSING');
          console.log('    deep_link:', tc.result.deep_link || 'MISSING');
        }
      }
    } else {
      console.log('  ❌ No tool calls were made!');
      console.log('  This means OpenAI did NOT call create_trip.');
    }

    console.log('\ntrip_data in response:');
    if (tripData) {
      console.log('  ✅ trip_data present');
      console.log('  trip_id:', tripData.trip_id || 'MISSING');
      console.log('  deep_link:', tripData.deep_link || 'MISSING');
    } else {
      console.log('  ❌ trip_data is null - deep link will not be shown in UI');
    }

    console.log('\nAssistant response (truncated):');
    console.log('  ', fullContent.slice(0, 200) + (fullContent.length > 200 ? '...' : ''));

  } catch (error) {
    console.error('Error:', error);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/chat');
    return response.ok || response.status === 405; // 405 = Method Not Allowed (GET not supported but server is up)
  } catch {
    return false;
  }
}

async function main() {
  console.log('Checking if dev server is running...');
  const serverUp = await checkServer();

  if (!serverUp) {
    console.log('❌ Dev server is not running on localhost:3000');
    console.log('   Please start the server with: npm run dev');
    return;
  }

  console.log('✅ Server is running\n');
  await testChatAPI();
}

main().catch(console.error);
