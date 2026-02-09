/**
 * Avinode Sandbox Reset Cleanup Script
 *
 * Counts and optionally deletes all Supabase records tied to the old Avinode
 * Sandbox API key. Run with: npx tsx scripts/avinode-sandbox-cleanup.ts [--delete]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const isDryRun = !process.argv.includes('--delete');

interface TableCount {
  table: string;
  count: number;
  identification: string;
}

async function countTable(table: string, filter?: string): Promise<number> {
  // Use raw count query via RPC or direct select
  if (filter) {
    const { count, error } = await (supabase.from as any)(table)
      .select('*', { count: 'exact', head: true })
      .or(filter);
    if (error) {
      console.error(`  Error counting ${table}: ${error.message}`);
      return -1;
    }
    return count ?? 0;
  } else {
    const { count, error } = await (supabase.from as any)(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`  Error counting ${table}: ${error.message}`);
      return -1;
    }
    return count ?? 0;
  }
}

async function deleteFromTable(table: string, filter?: string): Promise<number> {
  if (filter) {
    // For OR filters, we need to select IDs first then delete by ID
    const { data: rows, error: selectError } = await (supabase.from as any)(table)
      .select('id')
      .or(filter);
    if (selectError) {
      console.error(`  Error selecting from ${table}: ${selectError.message}`);
      return 0;
    }
    if (!rows || rows.length === 0) return 0;

    const ids = rows.map((r: any) => r.id);
    const { error } = await (supabase.from as any)(table)
      .delete()
      .in('id', ids);
    if (error) {
      console.error(`  Error deleting from ${table}: ${error.message}`);
      return 0;
    }
    return ids.length;
  } else {
    // Delete all rows - need at least one filter for Supabase
    // Use gte on id to match all UUIDs
    const { data: rows, error: selectError } = await (supabase.from as any)(table)
      .select('id');
    if (selectError) {
      console.error(`  Error selecting from ${table}: ${selectError.message}`);
      return 0;
    }
    if (!rows || rows.length === 0) return 0;

    const ids = rows.map((r: any) => r.id);
    const { error } = await (supabase.from as any)(table)
      .delete()
      .in('id', ids);
    if (error) {
      console.error(`  Error deleting from ${table}: ${error.message}`);
      return 0;
    }
    return ids.length;
  }
}

async function main() {
  console.log('=== Avinode Sandbox Reset Cleanup ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (use --delete to execute)' : 'DELETE'}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');

  // Phase 1: Inventory
  console.log('Phase 1: Inventory');
  console.log('─'.repeat(60));

  const counts: TableCount[] = [];

  // 1. avinode_webhook_events - all records
  const webhookCount = await countTable('avinode_webhook_events');
  counts.push({ table: 'avinode_webhook_events', count: webhookCount, identification: 'All records (Avinode-sourced)' });

  // 2. trip_segments - FK to affected requests
  // First get affected request IDs
  const { data: affectedRequests } = await (supabase.from as any)('requests')
    .select('id')
    .or('avinode_trip_id.not.is.null,avinode_rfq_id.not.is.null');
  const affectedRequestIds = (affectedRequests || []).map((r: any) => r.id);

  let segmentCount = 0;
  if (affectedRequestIds.length > 0) {
    const { count, error } = await (supabase.from as any)('trip_segments')
      .select('*', { count: 'exact', head: true })
      .in('request_id', affectedRequestIds);
    if (!error) segmentCount = count ?? 0;
    else if (error.code === '42P01') {
      console.log('  trip_segments table does not exist (skipping)');
      segmentCount = -1;
    } else {
      console.error(`  Error counting trip_segments: ${error.message}`);
    }
  }
  counts.push({ table: 'trip_segments', count: segmentCount, identification: 'FK to affected requests' });

  // 3. quotes - non-null avinode_quote_id
  const quotesCount = await countTable('quotes', 'avinode_quote_id.not.is.null');
  counts.push({ table: 'quotes', count: quotesCount, identification: 'Non-null avinode_quote_id' });

  // 4. chat_sessions - non-null avinode fields
  const chatSessionsCount = await countTable('chat_sessions', 'avinode_trip_id.not.is.null,avinode_rfq_id.not.is.null');
  counts.push({ table: 'chat_sessions', count: chatSessionsCount, identification: 'Non-null avinode_trip_id/rfp_id' });

  // 5. empty_leg_watches - non-null avinode_watch_id
  const emptyLegCount = await countTable('empty_leg_watches', 'avinode_watch_id.not.is.null');
  counts.push({ table: 'empty_leg_watches', count: emptyLegCount, identification: 'Non-null avinode_watch_id' });

  // 6. requests - non-null avinode fields
  const requestsCount = await countTable('requests', 'avinode_trip_id.not.is.null,avinode_rfq_id.not.is.null');
  counts.push({ table: 'requests', count: requestsCount, identification: 'Non-null avinode_trip_id/rfp_id' });

  // Also count messages tied to affected requests
  let messagesCount = 0;
  if (affectedRequestIds.length > 0) {
    const { count, error } = await (supabase.from as any)('messages')
      .select('*', { count: 'exact', head: true })
      .in('request_id', affectedRequestIds);
    if (!error) messagesCount = count ?? 0;
    else if (error.code === '42P01') {
      console.log('  messages table does not exist (skipping)');
      messagesCount = -1;
    }
  }
  if (messagesCount > 0) {
    counts.push({ table: 'messages', count: messagesCount, identification: 'FK to affected requests' });
  }

  // Also count workflow_states tied to affected requests
  let workflowCount = 0;
  if (affectedRequestIds.length > 0) {
    const { count, error } = await (supabase.from as any)('workflow_states')
      .select('*', { count: 'exact', head: true })
      .in('request_id', affectedRequestIds);
    if (!error) workflowCount = count ?? 0;
  }
  if (workflowCount > 0) {
    counts.push({ table: 'workflow_states', count: workflowCount, identification: 'FK to affected requests' });
  }

  // Also count proposals tied to affected requests
  let proposalsCount = 0;
  if (affectedRequestIds.length > 0) {
    const { count, error } = await (supabase.from as any)('proposals')
      .select('*', { count: 'exact', head: true })
      .in('request_id', affectedRequestIds);
    if (!error) proposalsCount = count ?? 0;
  }
  if (proposalsCount > 0) {
    counts.push({ table: 'proposals', count: proposalsCount, identification: 'FK to affected requests' });
  }

  // Also count agent_executions tied to affected requests
  let agentExecCount = 0;
  if (affectedRequestIds.length > 0) {
    const { count, error } = await (supabase.from as any)('agent_executions')
      .select('*', { count: 'exact', head: true })
      .in('request_id', affectedRequestIds);
    if (!error) agentExecCount = count ?? 0;
  }
  if (agentExecCount > 0) {
    counts.push({ table: 'agent_executions', count: agentExecCount, identification: 'FK to affected requests' });
  }

  // Display inventory
  console.log('');
  console.log('| Table                    | Records | Identification                |');
  console.log('|--------------------------|---------|-------------------------------|');
  let total = 0;
  for (const c of counts) {
    const countStr = c.count === -1 ? 'N/A' : String(c.count);
    if (c.count > 0) total += c.count;
    console.log(`| ${c.table.padEnd(24)} | ${countStr.padStart(7)} | ${c.identification.padEnd(29)} |`);
  }
  console.log('|--------------------------|---------|-------------------------------|');
  console.log(`| TOTAL                    | ${String(total).padStart(7)} |                               |`);
  console.log('');

  // Show affected requests detail
  if (affectedRequests && affectedRequests.length > 0) {
    console.log('Affected request IDs:');
    const { data: requestDetails } = await (supabase.from as any)('requests')
      .select('id, avinode_trip_id, avinode_rfq_id, departure_airport, arrival_airport, status, created_at')
      .or('avinode_trip_id.not.is.null,avinode_rfq_id.not.is.null');
    if (requestDetails) {
      for (const r of requestDetails) {
        console.log(`  - ${r.id} | trip=${r.avinode_trip_id || 'null'} | rfp=${r.avinode_rfq_id || 'null'} | ${r.departure_airport}->${r.arrival_airport} | ${r.status} | ${r.created_at}`);
      }
    }
    console.log('');
  }

  if (isDryRun) {
    console.log('DRY RUN complete. Run with --delete to execute cleanup.');
    return;
  }

  // Phase 3: Ordered Deletion (children first)
  console.log('Phase 3: Ordered Deletion');
  console.log('─'.repeat(60));

  // 1. Webhook events
  if (counts[0].count > 0) {
    const deleted = await deleteFromTable('avinode_webhook_events');
    console.log(`  avinode_webhook_events: ${deleted} deleted`);
  }

  // 2. Trip segments
  if (segmentCount > 0 && affectedRequestIds.length > 0) {
    const { error } = await (supabase.from as any)('trip_segments')
      .delete()
      .in('request_id', affectedRequestIds);
    console.log(`  trip_segments: ${error ? 'ERROR: ' + error.message : segmentCount + ' deleted'}`);
  }

  // 3. Agent executions (FK to requests)
  if (agentExecCount > 0 && affectedRequestIds.length > 0) {
    const { error } = await (supabase.from as any)('agent_executions')
      .delete()
      .in('request_id', affectedRequestIds);
    console.log(`  agent_executions: ${error ? 'ERROR: ' + error.message : agentExecCount + ' deleted'}`);
  }

  // 4. Proposals (FK to requests)
  if (proposalsCount > 0 && affectedRequestIds.length > 0) {
    const { error } = await (supabase.from as any)('proposals')
      .delete()
      .in('request_id', affectedRequestIds);
    console.log(`  proposals: ${error ? 'ERROR: ' + error.message : proposalsCount + ' deleted'}`);
  }

  // 5. Quotes
  if (quotesCount > 0) {
    const deleted = await deleteFromTable('quotes', 'avinode_quote_id.not.is.null');
    console.log(`  quotes: ${deleted} deleted`);
  }

  // 6. Workflow states (FK to requests)
  if (workflowCount > 0 && affectedRequestIds.length > 0) {
    const { error } = await (supabase.from as any)('workflow_states')
      .delete()
      .in('request_id', affectedRequestIds);
    console.log(`  workflow_states: ${error ? 'ERROR: ' + error.message : workflowCount + ' deleted'}`);
  }

  // 7. Messages (FK to requests)
  if (messagesCount > 0 && affectedRequestIds.length > 0) {
    const { error } = await (supabase.from as any)('messages')
      .delete()
      .in('request_id', affectedRequestIds);
    console.log(`  messages: ${error ? 'ERROR: ' + error.message : messagesCount + ' deleted'}`);
  }

  // 8. Chat sessions
  if (chatSessionsCount > 0) {
    const deleted = await deleteFromTable('chat_sessions', 'avinode_trip_id.not.is.null,avinode_rfq_id.not.is.null');
    console.log(`  chat_sessions: ${deleted} deleted`);
  }

  // 9. Empty leg watches
  if (emptyLegCount > 0) {
    const deleted = await deleteFromTable('empty_leg_watches', 'avinode_watch_id.not.is.null');
    console.log(`  empty_leg_watches: ${deleted} deleted`);
  }

  // 10. Requests (last — parent table)
  if (requestsCount > 0) {
    const deleted = await deleteFromTable('requests', 'avinode_trip_id.not.is.null,avinode_rfq_id.not.is.null');
    console.log(`  requests: ${deleted} deleted`);
  }

  console.log('');
  console.log('Cleanup complete. Verify the UI no longer shows stale trip cards.');
}

main().catch(console.error);
