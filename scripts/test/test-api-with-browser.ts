/**
 * Test API through browser session (using Playwright)
 */
import { chromium } from 'playwright';

async function testAPI() {
  console.log('Connecting to Chrome...');

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];

  if (!context) {
    console.log('No browser context found');
    await browser.close();
    return;
  }

  // Get the page that's on localhost:3000
  const pages = context.pages();
  let page = pages.find(p => p.url().includes('localhost:3000'));

  if (!page) {
    page = await context.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  }

  console.log('Current URL:', page.url());

  // Execute fetch in browser context (with auth cookies)
  const result = await page.evaluate(async () => {
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

    const text = await response.text();
    return {
      status: response.status,
      text: text,
    };
  });

  console.log('Status:', result.status);
  console.log('Response length:', result.text.length);

  // Parse SSE response
  const lines = result.text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        console.log('\n=== Parsed Response ===');
        console.log('Content preview:', data.content?.substring(0, 200) || '(none)');
        console.log('Done:', data.done);
        console.log('Mock mode:', data.mock_mode);
        console.log('Tool calls:', data.tool_calls?.map((tc: { name: string }) => tc.name) || 'none');
        console.log('Has trip_data:', !!data.trip_data);

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
        console.log('Raw line:', line.substring(0, 200));
      }
    }
  }

  await browser.close();
}

testAPI().catch(console.error);

export {};
