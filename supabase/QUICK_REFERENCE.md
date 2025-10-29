# Database Quick Reference Guide

Quick reference for common database operations in the JetVision AI Assistant.

## Table Relationships

```
iso_agents (User)
  ↓ (1:N)
client_profiles (Clients)
  ↓ (1:N)
requests (RFPs)
  ↓ (1:N)
quotes (Operator Quotes)

requests (RFPs)
  ↓ (1:N)
workflow_states (State History)

requests (RFPs)
  ↓ (1:N)
agent_executions (Execution Logs)
```

## Common Queries

### Create a New Request

```typescript
import { supabase } from '@/lib/supabase/server';
import { RequestInsert, RequestStatus } from '@/lib/types/database';

const newRequest: RequestInsert = {
  iso_agent_id: currentUserId,
  client_profile_id: clientId,
  departure_airport: 'KTEB',
  arrival_airport: 'KLAX',
  departure_date: '2025-11-20T09:00:00Z',
  passengers: 8,
  aircraft_type: 'Gulfstream G650',
  budget: 120000,
  status: RequestStatus.DRAFT,
};

const { data, error } = await supabase
  .from('requests')
  .insert(newRequest)
  .select()
  .single();
```

### Get User's Active Requests

```typescript
const { data, error } = await supabase
  .from('requests')
  .select(`
    *,
    client_profile:client_profiles(*)
  `)
  .in('status', [
    RequestStatus.PENDING,
    RequestStatus.ANALYZING,
    RequestStatus.SEARCHING_FLIGHTS,
    RequestStatus.AWAITING_QUOTES,
  ])
  .order('created_at', { ascending: false });
```

### Get Request with All Quotes

```typescript
const { data, error } = await supabase
  .from('requests')
  .select(`
    *,
    client_profile:client_profiles(*),
    quotes(*)
  `)
  .eq('id', requestId)
  .single();

// Sort quotes by ranking
if (data) {
  data.quotes.sort((a, b) => (a.ranking || 999) - (b.ranking || 999));
}
```

### Get Top Ranked Quotes

```typescript
const { data, error } = await supabase
  .from('quotes')
  .select('*')
  .eq('request_id', requestId)
  .in('status', [QuoteStatus.RECEIVED, QuoteStatus.ANALYZED])
  .order('ranking', { ascending: true, nullsFirst: false })
  .limit(3);
```

### Update Request Status

```typescript
const { data, error } = await supabase
  .from('requests')
  .update({ status: RequestStatus.AWAITING_QUOTES })
  .eq('id', requestId)
  .select()
  .single();
```

### Create Workflow State Entry

```typescript
import { WorkflowStateInsert } from '@/lib/types/database';

const stateEntry: WorkflowStateInsert = {
  request_id: requestId,
  current_state: RequestStatus.SEARCHING_FLIGHTS,
  previous_state: RequestStatus.FETCHING_CLIENT_DATA,
  agent_id: 'agent-flight-search-001',
  metadata: {
    avinode_rfp_created: true,
    operators_contacted: 15,
  },
  state_duration_ms: 2100,
};

// Note: This should be done by service role, not user
const { data, error } = await supabaseAdmin
  .from('workflow_states')
  .insert(stateEntry);
```

### Log Agent Execution

```typescript
import { AgentExecutionInsert, AgentType, ExecutionStatus } from '@/lib/types/database';

const execution: AgentExecutionInsert = {
  request_id: requestId,
  agent_type: AgentType.ORCHESTRATOR,
  agent_id: 'agent-orchestrator-001',
  input_data: { request_id: requestId, action: 'analyze_rfp' },
  output_data: { valid: true, next_step: 'fetch_client_data' },
  execution_time_ms: 1250,
  status: ExecutionStatus.COMPLETED,
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
};

// Note: This should be done by service role
const { data, error } = await supabaseAdmin
  .from('agent_executions')
  .insert(execution);
```

### Get Request Workflow History

```typescript
const { data, error } = await supabase
  .from('workflow_states')
  .select('*')
  .eq('request_id', requestId)
  .order('created_at', { ascending: true });

// Calculate total processing time
if (data && data.length > 0) {
  const totalTime = data.reduce((sum, state) => {
    return sum + (state.state_duration_ms || 0);
  }, 0);
  console.log(`Total processing time: ${totalTime}ms`);
}
```

### Search Client Profiles

```typescript
const { data, error } = await supabase
  .from('client_profiles')
  .select('*')
  .or(`company_name.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
  .eq('is_active', true)
  .order('company_name', { ascending: true });
```

### Get Agent Performance Metrics

```typescript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const { data, error } = await supabaseAdmin
  .from('agent_executions')
  .select('agent_type, execution_time_ms, status')
  .gte('started_at', sevenDaysAgo.toISOString());

// Process metrics
const metrics = data?.reduce((acc, execution) => {
  const agent = execution.agent_type;
  if (!acc[agent]) {
    acc[agent] = {
      total: 0,
      completed: 0,
      failed: 0,
      totalTime: 0,
    };
  }
  acc[agent].total++;
  if (execution.status === ExecutionStatus.COMPLETED) {
    acc[agent].completed++;
    acc[agent].totalTime += execution.execution_time_ms || 0;
  }
  if (execution.status === ExecutionStatus.FAILED) {
    acc[agent].failed++;
  }
  return acc;
}, {} as Record<string, any>);
```

## Supabase Client Setup

### Server-Side (Service Role)

```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

### Server-Side (User Context)

```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

export const createServerClient = (accessToken: string) => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
};
```

### Client-Side

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## RLS Testing

### Test as Specific User

```sql
-- Set user context
SET LOCAL request.jwt.claims.sub = 'user_test_agent_1';

-- Run query
SELECT * FROM requests;

-- Reset
RESET request.jwt.claims.sub;
```

### Verify RLS is Working

```typescript
// Should only return current user's requests
const { data: userRequests } = await supabase
  .from('requests')
  .select('*');

console.log('User requests:', userRequests);

// Admin check
const { data: isUserAdmin } = await supabase
  .rpc('is_admin');

console.log('Is admin:', isUserAdmin);
```

## Status Enums

### Request Status Flow

```
draft
  ↓
pending
  ↓
analyzing
  ↓
fetching_client_data
  ↓
searching_flights
  ↓
awaiting_quotes
  ↓
analyzing_proposals
  ↓
generating_email
  ↓
sending_proposal
  ↓
completed / failed / cancelled
```

### Quote Status Flow

```
pending
  ↓
received
  ↓
analyzed
  ↓
accepted / rejected / expired
```

## Useful Functions

### Get Current User's Agent ID

```typescript
const { data: agentId } = await supabase
  .rpc('get_current_iso_agent_id');
```

### Check if Current User is Admin

```typescript
const { data: isAdmin } = await supabase
  .rpc('is_admin');
```

### Check Resource Ownership

```typescript
const { data: ownsResource } = await supabase
  .rpc('owns_resource', { resource_agent_id: agentId });
```

## Error Handling

### Standard Error Handling Pattern

```typescript
const { data, error } = await supabase
  .from('requests')
  .select('*')
  .eq('id', requestId)
  .single();

if (error) {
  console.error('Database error:', error.message);
  throw new Error(`Failed to fetch request: ${error.message}`);
}

if (!data) {
  throw new Error('Request not found');
}

return data;
```

### Transaction Pattern

```typescript
// Use RPC for complex transactions
const { data, error } = await supabase.rpc('create_request_with_workflow', {
  request_data: newRequest,
  initial_state: RequestStatus.PENDING,
});
```

## Migration Commands

### Via Supabase CLI

```bash
# Run all migrations
supabase db push

# Run specific migration
supabase db push --file supabase/migrations/001_initial_schema.sql

# Reset database (WARNING: Deletes all data)
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > lib/types/supabase.ts
```

### Via SQL Editor (Supabase Dashboard)

1. Copy migration SQL
2. Paste into SQL Editor
3. Execute
4. Verify in Table Editor

## Best Practices

1. **Always use type-safe queries** with Database type parameter
2. **Handle errors explicitly** - never assume success
3. **Use RLS policies** - never bypass with service role unless necessary
4. **Validate data** at application level before inserting
5. **Use transactions** for multi-table operations
6. **Index foreign keys** for performance
7. **Use JSONB** for flexible, schema-less data
8. **Monitor query performance** with `EXPLAIN ANALYZE`
9. **Test RLS policies** thoroughly before deployment
10. **Use enums** for type safety and validation

## Common Pitfalls

❌ **Don't** use `SELECT *` for large tables
✅ **Do** specify needed columns

❌ **Don't** bypass RLS with service role for user operations
✅ **Do** use RLS policies for multi-tenant isolation

❌ **Don't** store sensitive data in JSONB metadata
✅ **Do** use encrypted columns for sensitive data

❌ **Don't** hard-code UUIDs
✅ **Do** use generated IDs or constants

❌ **Don't** ignore TypeScript errors
✅ **Do** fix type issues immediately

## Resources

- [Full Schema Documentation](./README.md)
- [TypeScript Types](../lib/types/database.ts)
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
