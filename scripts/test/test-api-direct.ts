/**
 * Test chat API directly and log full response
 */

async function testAPI() {
  console.log('Testing chat API...');

  try {
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
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('\n=== Raw Response ===');
    console.log(text);

    // Parse SSE
    console.log('\n=== Parsed SSE ===');
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          console.log('\nData object:');
          console.log('- content length:', data.content?.length || 0);
          console.log('- done:', data.done);
          console.log('- mock_mode:', data.mock_mode);
          console.log('- tool_calls:', data.tool_calls?.map((tc: any) => tc.name));
          console.log('- trip_data:', data.trip_data ? 'YES' : 'NO');
          console.log('- rfp_data:', data.rfp_data ? 'YES' : 'NO');

          if (data.trip_data) {
            console.log('\n=== Trip Data ===');
            console.log(JSON.stringify(data.trip_data, null, 2));
          }

          if (data.tool_calls) {
            console.log('\n=== Tool Calls ===');
            for (const tc of data.tool_calls) {
              console.log(`\n${tc.name}:`);
              console.log(JSON.stringify(tc.result, null, 2));
            }
          }
        } catch (e) {
          console.log('Parse error:', e);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();

export {};
