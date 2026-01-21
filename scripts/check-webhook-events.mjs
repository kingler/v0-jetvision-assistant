/**
 * Check Raw Webhook Events
 *
 * This script checks the raw webhook events stored in avinode_webhook_events
 * to see what Avinode actually sent, which can help diagnose encoding issues.
 *
 * Usage:
 *   node scripts/check-webhook-events.mjs JZLHJF
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load env vars
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TRIP_ID = process.argv[2] || 'JZLHJF';

async function main() {
  console.log('==============================================');
  console.log('   CHECK WEBHOOK EVENTS');
  console.log('==============================================');
  console.log(`Trip ID: ${TRIP_ID}\n`);

  // Find webhook events for this trip
  const { data: events, error } = await supabase
    .from('avinode_webhook_events')
    .select('*')
    .eq('avinode_trip_id', TRIP_ID)
    .order('received_at', { ascending: true });

  if (error) {
    console.error('Error fetching webhook events:', error.message);
    process.exit(1);
  }

  if (!events || events.length === 0) {
    console.log('No webhook events found for this trip ID.');
    process.exit(0);
  }

  console.log(`Found ${events.length} webhook event(s)\n`);

  // Check message events specifically
  const messageEvents = events.filter(e => 
    e.event_type === 'message_received' || 
    e.raw_payload?.type === 'TripChatSeller' ||
    e.raw_payload?.type === 'TripChatMine'
  );

  console.log(`Message events: ${messageEvents.length}\n`);

  for (const event of messageEvents) {
    console.log('--- Webhook Event ---');
    console.log(`ID: ${event.id.substring(0, 8)}...`);
    console.log(`Type: ${event.event_type}`);
    console.log(`Received: ${event.received_at}`);
    console.log(`Status: ${event.processing_status}`);
    
    if (event.raw_payload) {
      const payload = event.raw_payload;
      console.log(`Payload type: ${payload.type}`);
      
      if (payload.message) {
        console.log(`Message content (first 300 chars):`);
        console.log(`"${payload.message.content?.substring(0, 300) || 'N/A'}"`);
        console.log(`Message ID: ${payload.message.id || 'N/A'}`);
        console.log(`Sent at: ${payload.message.sentAt || 'N/A'}`);
      }
      
      if (payload.sender) {
        console.log(`Sender: ${payload.sender.name || 'N/A'} (${payload.sender.companyName || 'N/A'})`);
      }
    }
    
    console.log('');
  }

  // Also check the actual messages in the messages table
  console.log('\n--- Messages in messages table ---\n');
  
  const { data: request } = await supabase
    .from('requests')
    .select('id')
    .eq('avinode_trip_id', TRIP_ID)
    .limit(1)
    .single();

  if (request) {
    const { data: messages } = await supabase
      .from('messages')
      .select('id, content, sender_type, sender_name, created_at, metadata')
      .eq('request_id', request.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (messages) {
      console.log(`Found ${messages.length} message(s) in messages table:\n`);
      
      for (const msg of messages) {
        console.log(`--- Message ${msg.id.substring(0, 8)}... ---`);
        console.log(`Sender: ${msg.sender_type} (${msg.sender_name || 'N/A'})`);
        console.log(`Created: ${msg.created_at}`);
        console.log(`Content (first 200 chars):`);
        console.log(`"${msg.content?.substring(0, 200) || 'N/A'}"`);
        console.log('');
      }
    }
  }
}

main().catch(console.error);
