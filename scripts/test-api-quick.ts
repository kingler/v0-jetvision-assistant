/**
 * Quick API test to see what tools are called
 */

async function testAPI() {
  console.log('Sending request to chat API...');

  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025',
      conversationHistory: [],
    }),
  });

  console.log('Status:', response.status);

  const text = await response.text();
  console.log('\nRaw response length:', text.length);

  // Parse SSE data
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        console.log('\n=== Parsed Response ===');
        console.log('Content length:', data.content?.length || 0);
        console.log('Done:', data.done);
        console.log('Mock mode:', data.mock_mode);
        console.log('Tool calls:', data.tool_calls?.map((tc: { name: string }) => tc.name) || 'none');
        console.log('Has trip_data:', !!data.trip_data);
        console.log('Has rfp_data:', !!data.rfp_data);

        if (data.trip_data) {
          console.log('\n=== Trip Data ===');
          console.log('trip_id:', data.trip_data.trip_id);
          console.log('deep_link:', data.trip_data.deep_link);
        }

        if (data.tool_calls) {
          for (const tc of data.tool_calls) {
            if (tc.name === 'create_trip') {
              console.log('\n=== create_trip Result ===');
              console.log(JSON.stringify(tc.result, null, 2));
            }
          }
        }
      } catch (e) {
        console.log('Parse error:', e);
      }
    }
  }
}

testAPI().catch(console.error);

export {};
