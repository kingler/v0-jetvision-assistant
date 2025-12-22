/**
 * Send an API request through the browser and inspect the response
 */
import { chromium } from 'playwright';

async function verifyAPIResponse() {
  console.log('Connecting to Chrome...');

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];

  if (!context) {
    console.log('No browser context found');
    await browser.close();
    return;
  }

  const pages = context.pages();
  let page = pages.find(p => p.url().includes('localhost:3000'));

  if (!page) {
    page = await context.newPage();
    await page.goto('http://localhost:3000');
  }

  console.log('Sending API request through browser...');

  // Execute fetch in browser context (with auth cookies)
  const result = await page.evaluate(async () => {
    console.log('[Browser] Starting fetch...');

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025',
        conversationHistory: [],
      }),
    });

    console.log('[Browser] Response status:', response.status);

    const text = await response.text();
    console.log('[Browser] Response length:', text.length);

    return {
      status: response.status,
      text: text,
      length: text.length,
    };
  });

  console.log('Status:', result.status);
  console.log('Response length:', result.length);

  // Parse the SSE response
  const lines = result.text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        console.log('\n=== Response Data ===');
        console.log('done:', data.done);
        console.log('mock_mode:', data.mock_mode);
        console.log('content length:', data.content?.length || 0);
        console.log('tool_calls:', data.tool_calls?.map((tc: any) => tc.name) || 'none');
        console.log('has trip_data:', !!data.trip_data);

        if (data.trip_data) {
          console.log('\n=== Trip Data ===');
          console.log('trip_id:', data.trip_data.trip_id);
          console.log('deep_link:', data.trip_data.deep_link);
        }

        if (data.tool_calls) {
          for (const tc of data.tool_calls) {
            if (tc.name === 'create_trip' && tc.result) {
              console.log('\n=== create_trip result ===');
              console.log('trip_id:', tc.result.trip_id);
              console.log('deep_link:', tc.result.deep_link);
            }
          }
        }
      } catch (e) {
        console.log('Parse error for line:', line.substring(0, 50));
      }
    }
  }

  await browser.close();
}

verifyAPIResponse().catch(console.error);

export {};
