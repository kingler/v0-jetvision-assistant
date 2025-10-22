# Supabase Integration

This directory contains Supabase client configurations for different environments.

## Files

- `client.ts` - Standard client (respects RLS, client-safe)
- `admin.ts` - Service role client (bypasses RLS, server-only)
- `index.ts` - Barrel exports for both clients

## Row Level Security (RLS)

All database queries are automatically filtered by the authenticated user's `clerk_user_id`.
This ensures multi-tenant data isolation.

## Usage

### Standard Client (Recommended)

**Use this for most operations** - respects RLS and is safe for client-side use.

```typescript
import { supabase } from '@/lib/supabase'

// Use for authenticated operations
const { data, error } = await supabase
  .from('requests')
  .select('*')
  .eq('created_by', userId);
```

### Admin Client (Service Role)

**WARNING**: Only use for server-side operations that require elevated privileges.

```typescript
import { supabaseAdmin } from '@/lib/supabase/admin'

// Use for agent operations, webhooks, system tasks
const { data, error } = await supabaseAdmin
  .from('agent_executions')
  .insert(execution);
```

### Helper Functions

```typescript
import {
  logAgentExecution,
  createWorkflowState,
  createQuote,
  syncUserFromClerk
} from '@/lib/supabase/admin';

// Type-safe helpers for common operations
await logAgentExecution({
  request_id: requestId,
  agent_type: AgentType.ORCHESTRATOR,
  status: ExecutionStatus.COMPLETED,
  // ...
});
```

## Database Types

All Supabase operations use TypeScript types from `@/lib/types/database`.

See `../../supabase/README.md` for full database schema documentation.
