/**
 * Test Avinode Webhook Endpoint
 *
 * Usage: npx tsx scripts/test-webhook.ts
 */

async function testWebhook() {
  // Use /api/webhooks (simpler URL that Avinode accepts)
  const webhookUrl = 'https://v0-jetvision-assistant.vercel.app/api/webhooks';

  const testPayload = {
    event: 'TripRequestSellerResponse',
    eventId: `test-event-${Date.now()}`,
    timestamp: new Date().toISOString(),
    data: {
      trip: { id: 'test-trip-001' },
      request: { id: 'test-request-001', status: 'quoted' },
      seller: { name: 'Test Operator', companyName: 'Test Aviation LLC' },
      quote: {
        id: 'test-quote-001',
        totalPrice: { amount: 25000, currency: 'USD' },
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        aircraft: { model: 'Gulfstream G650' }
      }
    }
  };

  console.log('Testing webhook endpoint:', webhookUrl);
  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  console.log('');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-avinode-signature': 'test-signature-for-dev'
      },
      body: JSON.stringify(testPayload)
    });

    const text = await response.text();
    console.log('Raw Response:', text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.substring(0, 200) };
    }

    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Webhook endpoint is responding!');
    } else {
      console.log('\n⚠️ Webhook returned error status');
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
  }
}

// Also test GET health check
async function testHealthCheck() {
  const healthUrl = 'https://v0-jetvision-assistant.vercel.app/api/webhooks';

  console.log('\n--- Health Check ---');
  console.log('URL:', healthUrl);

  try {
    const response = await fetch(healthUrl);
    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.status === 'healthy') {
      console.log('\n✅ Health check passed!');
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}

async function main() {
  console.log('=== Avinode Webhook Test ===\n');

  await testHealthCheck();
  console.log('\n--- POST Test ---');
  await testWebhook();
}

main();
