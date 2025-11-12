#!/usr/bin/env tsx

/**
 * Test Clerk Webhook Locally
 *
 * This script sends a test user.created webhook event to your local webhook endpoint
 * to verify the Clerk → Supabase sync is working correctly.
 *
 * Usage:
 *   1. Start your dev server: npm run dev:app
 *   2. Run this script: tsx scripts/clerk/test-webhook.ts
 */

import { Webhook } from 'svix';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/clerk';

if (!WEBHOOK_SECRET) {
  console.error('❌ CLERK_WEBHOOK_SECRET environment variable is not set');
  console.log('Please set CLERK_WEBHOOK_SECRET in your .env.local file');
  process.exit(1);
}

// Test user data
const testUserEvent = {
  type: 'user.created',
  data: {
    id: 'user_test_' + Date.now(),
    email_addresses: [
      {
        email_address: 'test-webhook@example.com',
        id: 'email_test_' + Date.now(),
        verification: {
          status: 'verified',
          strategy: 'email_code',
        },
      },
    ],
    first_name: 'Test',
    last_name: 'User',
    public_metadata: {
      role: 'sales_rep', // or 'admin', 'customer', 'operator'
    },
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  object: 'event',
  timestamp: Math.floor(Date.now() / 1000),
};

async function testWebhook() {
  console.log('🧪 Testing Clerk Webhook');
  console.log('========================\n');

  console.log('📍 Webhook URL:', WEBHOOK_URL);
  console.log('👤 Test User:', testUserEvent.data.email_addresses[0].email_address);
  console.log('🎭 Role:', testUserEvent.data.public_metadata.role);
  console.log('🆔 Clerk User ID:', testUserEvent.data.id);
  console.log();

  try {
    // Type guard to ensure WEBHOOK_SECRET is defined
    if (!WEBHOOK_SECRET) {
      throw new Error('WEBHOOK_SECRET is not defined');
    }

    // Create Svix webhook instance
    const wh = new Webhook(WEBHOOK_SECRET);

    // Generate webhook signature
    const payload = JSON.stringify(testUserEvent);
    const timestamp = new Date();
    const msgId = 'webhook_test_' + Date.now();
    const signatureHeader = wh.sign(msgId, timestamp, payload);

    // Svix sign() returns the signature header value
    const svixId = msgId;
    const svixTimestamp = Math.floor(timestamp.getTime() / 1000).toString();
    const svixSignature = signatureHeader as string;

    console.log('📝 Generated webhook signature');
    console.log('Headers:', {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature.substring(0, 20) + '...',
    });
    console.log();

    // Send webhook request
    console.log('📤 Sending webhook request...');
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      },
      body: payload,
    });

    console.log();
    console.log('📥 Response received');
    console.log('Status:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('Body:', responseText);
    console.log();

    if (response.ok) {
      console.log('✅ Webhook test successful!');
      console.log();
      console.log('Next steps:');
      console.log('1. Check your Supabase iso_agents table for the new user:');
      console.log(`   SELECT * FROM iso_agents WHERE email = '${testUserEvent.data.email_addresses[0].email_address}';`);
      console.log();
      console.log('2. Check your server logs for:');
      console.log('   - "Received webhook event: user.created"');
      console.log('   - "Successfully created user in Supabase: ..."');
    } else {
      console.error('❌ Webhook test failed');
      console.error('Check the error message above for details');
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testWebhook();
