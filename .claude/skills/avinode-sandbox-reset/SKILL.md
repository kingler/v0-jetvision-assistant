---
name: avinode-sandbox-reset
description: Use when the Avinode Sandbox API key has been reset (every Monday morning) and a new key has been generated. Cleans up all Supabase records tied to the old API key — invalid TripIDs, webhook events, messages, proposals, and related child records — then verifies the UI no longer displays stale data.
---

# Avinode Sandbox Reset Cleanup

Complete Supabase database cleanup after the Avinode Sandbox API key resets. The sandbox key resets **every Monday morning**, invalidating all TripIDs and webhook data associated with the previous key.

## When to Use

- **Monday morning** after generating a new Avinode Sandbox API key
- **After any API key rotation** in the Avinode app
- **Stale trip cards appear** in the chat UI with invalid TripIDs
- **Webhook events are failing** because they reference old trip IDs
- **Deep links are broken** — Avinode links return 404 or "not found"

## When NOT to Use

- **Production API key rotation** — this skill targets the sandbox environment only
- **Single record fix** — manually update via Supabase dashboard instead
- **UI-only issue** — if the data is valid but the UI is rendering incorrectly, debug the component

## Prerequisites

1. **New Avinode Sandbox API key** already generated in the Avinode app
2. **Supabase access** via admin client (`lib/supabase/admin.ts`) or cleanup script
3. **Next.js dev server** running (for UI verification step)

## Command Usage

```bash
# Full cleanup — all tables, with confirmation before deletion
/avinode-sandbox-reset

# Or run the standalone script directly:
npx tsx scripts/avinode-sandbox-cleanup.ts           # Dry run
npx tsx scripts/avinode-sandbox-cleanup.ts --delete   # Execute
```

## Core Workflow

```
/avinode-sandbox-reset
        |
        v
  Phase 1: Inventory
        |  - Count records in each affected table
        |  - Show summary table to user
        v
  Phase 2: User Confirmation
        |  - Display deletion plan
        |  - Wait for explicit "yes" approval
        v
  Phase 3: Ordered Deletion
        |  - Delete in dependency order (children first)
        |  - Report per-table counts
        v
  Phase 4: Verification
        |  - Re-count all tables (should be 0)
        |  - Check UI for stale cards
        v
  Cleanup Report
```

## Affected Tables (Deletion Order)

Tables must be cleaned in dependency order to avoid foreign key constraint violations. Delete **children first**, then parents.

### Actual Schema (verified Feb 2026)

**Important**: The `requests` table uses `avinode_rfq_id` (not `avinode_rfp_id`). The `chat_sessions` table does **not exist** in the current schema.

### Deletion Order

| Order | Table | Key Columns | Description |
|-------|-------|-------------|-------------|
| 1 | `avinode_webhook_events` | `avinode_trip_id`, `avinode_rfp_id`, `avinode_quote_id` | Webhook payloads from Avinode |
| 2 | `proposals` | `request_id` (FK to requests) | Email proposals |
| 3 | `messages` | `request_id` (FK to requests) | Chat messages tied to trip requests |
| 4 | `quotes` | `avinode_quote_id`, `request_id` (FK) | Operator quotes |
| 5 | `workflow_states` | `request_id` (FK to requests) | Workflow state tracking |
| 6 | `trip_segments` | `request_id` (FK to requests) | Multi-city flight segments |
| 7 | `agent_executions` | `request_id` (FK to requests) | Agent execution logs |
| 8 | `empty_leg_watches` | `avinode_watch_id` | Empty leg subscriptions |
| 9 | `requests` | `avinode_trip_id`, `avinode_rfq_id`, `avinode_deep_link` | Core trip requests (parent — deleted last) |

### Identification Strategy

Records are identified for deletion by:

1. **Primary**: Find all `requests` where `avinode_trip_id IS NOT NULL`
2. **Cascade**: Delete all child records (messages, proposals, quotes, etc.) whose `request_id` is in the affected set
3. **Webhook events**: Delete all records (all are Avinode-sourced)

```sql
-- Find affected request IDs
SELECT id FROM requests WHERE avinode_trip_id IS NOT NULL;

-- Count children tied to affected requests
SELECT count(*) FROM messages WHERE request_id IN (SELECT id FROM requests WHERE avinode_trip_id IS NOT NULL);
SELECT count(*) FROM proposals WHERE request_id IN (...);

-- Webhook events: all records
SELECT count(*) FROM avinode_webhook_events;
```

## Phase Details

### Phase 1: Inventory

Run count queries via the Supabase admin client. Present a summary table:

```markdown
| Table | Records to Delete | Identification |
|-------|-------------------|----------------|
| avinode_webhook_events | 4 | All records (Avinode-sourced) |
| proposals | 9 | FK to affected requests |
| messages | 251 | FK to affected requests |
| quotes | 0 | Non-null avinode_quote_id or FK |
| trip_segments | 0 | FK to affected requests |
| requests | 60 | Non-null avinode_trip_id |
| **Total** | **324** | |
```

### Phase 2: User Confirmation

**Always ask for explicit confirmation before any deletion.** Display the inventory table and ask:

> "I found {N} total records across {M} tables tied to the old Avinode Sandbox API key. Should I proceed with deletion? (yes/no)"

Do NOT proceed without an affirmative response.

### Phase 3: Ordered Deletion

Execute deletions using the Supabase JS client. Delete in batches for large tables (100 at a time for messages). Use `.in('id', ids)` for safe targeted deletion.

```typescript
// 1. Get affected request IDs
const { data } = await supabase.from('requests')
  .select('id')
  .not('avinode_trip_id', 'is', null);
const requestIds = data.map(r => r.id);

// 2. Delete webhook events
await supabase.from('avinode_webhook_events').delete().in('id', webhookIds);

// 3. Delete proposals
await supabase.from('proposals').delete().in('request_id', requestIds);

// 4. Delete messages (in batches of 100)
// ... batch loop ...

// 5. Delete quotes, workflow_states, trip_segments, agent_executions
// ... (same pattern) ...

// 6. Delete requests (parent — last)
await supabase.from('requests').delete().in('id', requestIds);
```

After each DELETE, capture the row count and report it.

### Phase 4: Verification

1. **Database verification**: Re-run the count queries. Requests with `avinode_trip_id` should be 0.
2. **UI verification**:
   - Check that the chat interface no longer displays trip cards with invalid Avinode TripIDs
   - Confirm no "Open in Avinode" deep link buttons are visible for deleted trips
   - Verify no stale webhook event indicators are shown

## Standalone Script

The reusable cleanup script lives at `scripts/avinode-sandbox-cleanup.ts`:

```bash
# Dry run (inventory only)
npx tsx scripts/avinode-sandbox-cleanup.ts

# Execute deletion
npx tsx scripts/avinode-sandbox-cleanup.ts --delete
```

## Safety Guardrails

1. **Never delete without user confirmation** — always show the inventory first
2. **Respect dependency order** — delete children before parents to avoid FK violations
3. **Preserve non-Avinode records** — only delete records with non-null `avinode_trip_id`
4. **Use targeted deletes** — always use `.in('id', ids)` or `.in('request_id', ids)`, never unfiltered
5. **Batch large deletes** — process messages in batches of 100 to avoid timeouts
6. **Report counts** — always show before/after counts for audit

## Troubleshooting

### Foreign Key Constraint Error
If a DELETE fails due to FK constraints, check the deletion order. Child records (messages, proposals, quotes) must be deleted before parent records (requests).

### RLS Blocking Deletes
Use the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) to bypass Row Level Security during cleanup operations.

### Some Records Not Deleted
Records without `avinode_trip_id` are intentionally preserved. These are non-Avinode records (general conversations, etc.) that should remain.

### UI Still Shows Stale Data
- Clear browser cache / hard refresh
- Check if the chat interface caches messages in localStorage
- Verify the SSE connection reconnected after cleanup
- Restart the dev server if server-side caching is in play

## Related Skills

- [linear-cleanup](.claude/skills/linear-cleanup/SKILL.md) — Clean up Linear issues
- [linear-fix-issue](.claude/skills/linear-fix-issue/SKILL.md) — Fix bugs from Linear issues

## Related Documentation

- [Avinode API Integration](docs/api/AVINODE_API_INTEGRATION.md)
- [Deep Link Workflow](docs/subagents/agents/flight-search/DEEP_LINK_WORKFLOW.md)
- [Webhook Events](docs/implementation/WORKFLOW-AVINODE-INTEGRATION.md)
