/**
 * Test the chat API with a flight request to verify deep link generation
 */

async function testChatAPI() {
  console.log('\n=== Testing Chat API for Deep Link ===\n');

  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'I need a flight from KTEB to KVNY for 4 passengers on 2025-01-20',
      conversationHistory: [],
    }),
  });

  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));

  const text = await response.text();
  console.log('\nRaw response:', text.substring(0, 500));

  // Parse SSE data
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        console.log('\nParsed data:', JSON.stringify(data, null, 2));

        // Check for trip data with deep link
        if (data.trip_data) {
          console.log('\n✅ Trip data found!');
          console.log('  Trip ID:', data.trip_data.trip_id);
          console.log('  Deep Link:', data.trip_data.deep_link);
        } else if (data.tool_calls) {
          for (const tc of data.tool_calls) {
            if (tc.name === 'create_trip' && tc.result) {
              console.log('\n✅ create_trip tool called!');
              console.log('  Trip ID:', tc.result.trip_id);
              console.log('  Deep Link:', tc.result.deep_link);
            }
          }
        }
      } catch (e) {
        // Not JSON
      }
    }
  }

  console.log('\n=== Test Complete ===\n');
}

testChatAPI().catch(console.error);
