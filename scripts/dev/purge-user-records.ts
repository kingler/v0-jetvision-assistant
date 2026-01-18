#!/usr/bin/env npx tsx
/**
 * Purge all records for a specific user by email or agent ID
 *
 * Updated for consolidated schema (migration 030-033):
 * - Messages link directly to requests via request_id
 * - No more chat_sessions or conversations tables
 *
 * Usage:
 *   npx tsx scripts/dev/purge-user-records.ts <email-or-agent-id>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'MISSING');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findAgentByEmailOrId(identifier: string): Promise<{ id: string; email: string; full_name: string } | null> {
  // Check if it's a UUID (agent ID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(identifier)) {
    const { data, error } = await supabase
      .from('iso_agents')
      .select('id, email, full_name')
      .eq('id', identifier)
      .single();

    if (error || !data) {
      console.error('Agent not found by ID:', identifier);
      return null;
    }
    return data;
  } else {
    // Search by email
    const { data, error } = await supabase
      .from('iso_agents')
      .select('id, email, full_name')
      .eq('email', identifier)
      .single();

    if (error || !data) {
      console.error('Agent not found by email:', identifier);
      return null;
    }
    return data;
  }
}

async function purgeUserRecords(agentId: string) {
  console.log(`\n=== PURGING ALL RECORDS FOR AGENT: ${agentId} ===\n`);

  // 1. Get all requests for this agent
  const { data: requests, error: reqError } = await supabase
    .from('requests')
    .select('id, departure_airport, arrival_airport, status, message_count')
    .eq('iso_agent_id', agentId);

  if (reqError) {
    console.error('Error fetching requests:', reqError.message);
    return;
  }

  console.log(`Found ${requests?.length || 0} requests to purge.`);

  if (requests && requests.length > 0) {
    const requestIds = requests.map(r => r.id);

    // 2. Delete messages linked to these requests (new schema: request_id)
    console.log('Deleting messages...');
    const { error: messagesError, count: messagesCount } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .in('request_id', requestIds);

    if (messagesError) {
      console.error('  Error deleting messages:', messagesError.message);
    } else {
      console.log(`  Deleted ${messagesCount || 0} messages.`);
    }

    // 3. Delete quotes linked to requests
    console.log('Deleting quotes...');
    const { error: quotesError, count: quotesCount } = await supabase
      .from('quotes')
      .delete({ count: 'exact' })
      .in('request_id', requestIds);

    if (quotesError) {
      console.error('  Error deleting quotes:', quotesError.message);
    } else {
      console.log(`  Deleted ${quotesCount || 0} quotes.`);
    }

    // 4. Delete proposals linked to requests
    console.log('Deleting proposals...');
    const { error: proposalsError, count: proposalsCount } = await supabase
      .from('proposals')
      .delete({ count: 'exact' })
      .in('request_id', requestIds);

    if (proposalsError) {
      console.error('  Error deleting proposals:', proposalsError.message);
    } else {
      console.log(`  Deleted ${proposalsCount || 0} proposals.`);
    }

    // 5. Delete requests
    console.log('Deleting requests...');
    const { error: reqDelError, count: reqCount } = await supabase
      .from('requests')
      .delete({ count: 'exact' })
      .eq('iso_agent_id', agentId);

    if (reqDelError) {
      console.error('  Error deleting requests:', reqDelError.message);
    } else {
      console.log(`  Deleted ${reqCount || 0} requests.`);
    }
  }

  // Legacy cleanup: chat_sessions table was removed in schema consolidation (migration 030-033)
  // Sessions are now stored directly in the requests table via session_status, conversation_type fields
  console.log('\nLegacy cleanup skipped - chat_sessions table removed in schema consolidation.');

  // Conversations linked to user's requests (may not exist after cleanup migration)
  try {
    const { data: userRequests } = await supabase
      .from('requests')
      .select('id')
      .eq('iso_agent_id', agentId);

    if (userRequests && userRequests.length > 0) {
      const reqIds = userRequests.map(r => r.id);
      const { error: convError, count: convCount } = await supabase
        .from('conversations')
        .delete({ count: 'exact' })
        .in('request_id', reqIds);

      if (!convError) {
        console.log(`  Deleted ${convCount || 0} legacy conversations.`);
      }
    }
  } catch {
    // Table doesn't exist, ignore
  }

  console.log('\n=== PURGE COMPLETE ===\n');

  // Verify deletion
  console.log('Verifying deletion...');
  const { data: remainingRequests } = await supabase
    .from('requests')
    .select('id')
    .eq('iso_agent_id', agentId);

  const { data: remainingMessages } = await supabase
    .from('messages')
    .select('id, request_id')
    .in('request_id', (remainingRequests || []).map(r => r.id));

  console.log(`  Remaining requests: ${remainingRequests?.length || 0}`);
  console.log(`  Remaining messages: ${remainingMessages?.length || 0}`);
}

async function listUserRecords(agentId: string) {
  console.log(`\n=== RECORDS FOR AGENT: ${agentId} ===\n`);

  // Requests
  const { data: requests } = await supabase
    .from('requests')
    .select('id, departure_airport, arrival_airport, status, session_status, message_count, created_at')
    .eq('iso_agent_id', agentId)
    .order('created_at', { ascending: false });

  console.log(`Requests: ${requests?.length || 0}`);
  requests?.forEach(r => {
    console.log(`  - ${r.id}`);
    console.log(`    Route: ${r.departure_airport} → ${r.arrival_airport}`);
    console.log(`    Status: ${r.status} | Session: ${r.session_status || 'N/A'}`);
    console.log(`    Messages: ${r.message_count || 0}`);
  });

  // Messages (sample)
  const { data: messages, count: msgCount } = await supabase
    .from('messages')
    .select('id, request_id, sender_type, created_at', { count: 'exact' })
    .in('request_id', (requests || []).map(r => r.id))
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`\nMessages: ${msgCount || 0} total (showing first 10)`);
  messages?.forEach(m => {
    console.log(`  - ${m.id} (${m.sender_type}) in request ${m.request_id?.slice(0, 8)}...`);
  });
}

// Main entry point
async function main() {
  const command = process.argv[2];
  const identifier = process.argv[3] || process.argv[2];

  if (!command) {
    console.log('Database User Record Management Utility');
    console.log('');
    console.log('Usage:');
    console.log('  npx tsx scripts/dev/purge-user-records.ts <email>         # Purge user records');
    console.log('  npx tsx scripts/dev/purge-user-records.ts list <email>    # List user records');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx scripts/dev/purge-user-records.ts kinglerbercy@gmail.com');
    console.log('  npx tsx scripts/dev/purge-user-records.ts list kinglerbercy@gmail.com');
    process.exit(1);
  }

  // Handle "list" command
  if (command === 'list') {
    if (!identifier || identifier === 'list') {
      console.error('Please provide an email or agent ID');
      process.exit(1);
    }

    const agent = await findAgentByEmailOrId(identifier);
    if (!agent) {
      console.error('Could not find agent. Exiting.');
      process.exit(1);
    }

    console.log('Found agent:');
    console.log(`  ID: ${agent.id}`);
    console.log(`  Email: ${agent.email}`);
    console.log(`  Name: ${agent.full_name}`);

    await listUserRecords(agent.id);
    return;
  }

  // Default: purge records
  const agent = await findAgentByEmailOrId(command);

  if (!agent) {
    console.error('Could not find agent. Exiting.');
    process.exit(1);
  }

  console.log('Found agent:');
  console.log(`  ID: ${agent.id}`);
  console.log(`  Email: ${agent.email}`);
  console.log(`  Name: ${agent.full_name}`);
  console.log('');

  await purgeUserRecords(agent.id);
}

main().catch(console.error);
