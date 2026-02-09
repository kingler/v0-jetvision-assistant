# Supabase Implementation Consolidation Design

**Date**: 2025-12-24
**Status**: Approved for Implementation
**Author**: Claude Code (Brainstorming Skill)

## Problem Statement

The codebase has **duplicate Supabase implementations**:

1. **`lib/supabase/`** - Type-safe clients with domain-specific helpers (used by 87+ files)
2. **`mcp-servers/supabase-mcp-server/`** - Standalone MCP server with generic CRUD (not yet in production)

### Current Issues

| Issue | Impact |
|-------|--------|
| Duplicate client initialization | Maintenance burden, inconsistent configuration |
| MCP server lacks type safety | Runtime errors, no IDE support |
| No shared Database types | Type mismatches between systems |
| Separate RLS handling | Security policy divergence |

## Analysis Findings

### Usage Pattern Classification: "Not Yet in Production"

Evidence:
- Only test files reference `supabase_query`, `supabase_insert` MCP tools
- Agents use direct imports from `lib/supabase/admin.ts`
- ClientDataAgent uses mock data with TODO comment
- 87 files use Supabase directly via `lib/supabase/` clients

### Current File Structure

```
lib/supabase/
├── client.ts          # Browser client with RLS
├── admin.ts           # Service role client (bypasses RLS)
├── helpers.ts         # Type utility functions
├── server.ts          # Server-side client
└── index.ts           # Barrel exports

mcp-servers/supabase-mcp-server/
└── src/
    └── index.ts       # 589-line standalone MCP server
```

## Solution Design

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    lib/supabase/ (Shared Core)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│
│  │client.ts │  │ admin.ts │  │helpers.ts│  │mcp-helpers.ts││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘│
│       └─────────────┼─────────────┴────────────────┘        │
│                     ▼                                       │
│            ┌────────────────────┐                           │
│            │ types/supabase.ts  │                           │
│            │ (Generated Types)  │                           │
│            └────────────────────┘                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────────────┐
│  API Routes   │ │ Agent Direct  │ │   MCP Server          │
│  (87+ files)  │ │  Imports      │ │ (Thin Wrapper)        │
│  No changes   │ │  No changes   │ │ imports from lib/     │
└───────────────┘ └───────────────┘ └───────────────────────┘
```

### Key Changes

#### 1. New File: `lib/supabase/mcp-helpers.ts`

Generic query operations for MCP server use:

```typescript
import { supabaseAdmin } from './admin';
import type { Database } from '@/lib/types/database';

export type TableName = keyof Database['public']['Tables'];

export interface QueryOptions {
  select?: string;
  filter?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export async function queryTable(
  table: TableName,
  options: QueryOptions = {}
) {
  let query = supabaseAdmin.from(table).select(options.select || '*');

  if (options.filter) {
    for (const [key, value] of Object.entries(options.filter)) {
      query = query.eq(key, value);
    }
  }

  if (options.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true
    });
  }

  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

  return query;
}

export async function insertRow(
  table: TableName,
  data: Record<string, unknown>
) {
  return supabaseAdmin.from(table).insert(data).select().single();
}

export async function updateRow(
  table: TableName,
  filter: Record<string, unknown>,
  data: Record<string, unknown>
) {
  let query = supabaseAdmin.from(table).update(data);
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value);
  }
  return query.select();
}

export async function deleteRow(
  table: TableName,
  filter: Record<string, unknown>
) {
  let query = supabaseAdmin.from(table).delete();
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value);
  }
  return query;
}

export async function countRows(
  table: TableName,
  filter?: Record<string, unknown>
) {
  let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value);
    }
  }
  return query;
}

export async function callRpc(
  functionName: string,
  params?: Record<string, unknown>
) {
  return supabaseAdmin.rpc(functionName, params);
}

export async function listTables(): Promise<string[]> {
  // Return known table names from Database type
  return [
    'users',
    'client_profiles',
    'requests',
    'quotes',
    'proposals',
    'workflow_states',
    'agent_executions',
    'chatkit_sessions',
  ];
}

export async function describeTable(table: TableName) {
  // Return column info from Database type
  type TableRow = Database['public']['Tables'][typeof table]['Row'];
  // This would need runtime introspection or hardcoded metadata
  // For now, query information_schema
  const { data, error } = await supabaseAdmin.rpc('get_table_columns', {
    table_name: table
  });

  if (error) {
    // Fallback: return type keys if RPC not available
    return { columns: [], error: error.message };
  }

  return { columns: data, error: null };
}
```

#### 2. Refactored MCP Server: `mcp-servers/supabase-mcp-server/src/index.ts`

Reduce from 589 lines to ~150 lines by importing shared helpers:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  queryTable,
  insertRow,
  updateRow,
  deleteRow,
  countRows,
  callRpc,
  listTables,
  describeTable,
  type TableName,
  type QueryOptions,
} from '../../../lib/supabase/mcp-helpers';

const server = new Server(
  { name: 'supabase-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Tool definitions remain the same (8 tools)
// But handlers now delegate to shared helpers

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'supabase_query': {
      const { table, select, filter, order_by, limit, offset } = args;
      const result = await queryTable(table as TableName, {
        select,
        filter,
        orderBy: order_by,
        limit,
        offset,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }

    case 'supabase_insert': {
      const { table, data } = args;
      const result = await insertRow(table as TableName, data);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }

    // ... similar for other tools
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

#### 3. Update Barrel Export: `lib/supabase/index.ts`

```typescript
// Existing exports
export { supabaseClient, getUserProfile, getUserRequests, getRequest, createRequest, getQuotesForRequest } from './client';
export { supabaseAdmin, logAgentExecution, createWorkflowState, createQuote, syncUserFromClerk, updateRequestWithAvinodeTrip } from './admin';
export { createServerClient } from './server';
export * from './helpers';

// New MCP helpers export
export * from './mcp-helpers';
```

## Implementation Steps

### Phase 1: Create Shared Helpers (No Breaking Changes)

1. Create `lib/supabase/mcp-helpers.ts`
2. Add exports to `lib/supabase/index.ts`
3. Test helpers independently

### Phase 2: Refactor MCP Server

1. Update MCP server imports to use shared helpers
2. Remove duplicate client initialization
3. Remove duplicate query logic
4. Test MCP server with Claude Code

### Phase 3: Add Type Safety to MCP (Optional Enhancement)

1. Add `TableName` validation
2. Add column validation via `describeTable`
3. Return typed errors

### Phase 4: Cleanup

1. Remove unused code from MCP server
2. Update documentation
3. Add integration tests

## Benefits

| Benefit | Description |
|---------|-------------|
| **Single Source of Truth** | One Supabase client configuration |
| **Type Safety** | MCP server inherits `Database` types |
| **Reduced Code** | MCP server reduced from 589 to ~150 lines |
| **Consistent RLS** | Same service role handling everywhere |
| **Easier Testing** | Mock one location, test everywhere |
| **Maintainability** | Schema changes propagate automatically |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking MCP server | MCP server not in production yet |
| Import path issues | Use path aliases consistently |
| Type mismatches | Generate types from same source |

## Testing Strategy

1. **Unit Tests**: Test `mcp-helpers.ts` functions
2. **Integration Tests**: Test MCP server with mock Supabase
3. **E2E Tests**: Test agent calling MCP tools

## Success Criteria

- [ ] MCP server imports from `lib/supabase/`
- [ ] No duplicate `createClient()` calls
- [ ] All 8 MCP tools still functional
- [ ] Type safety for table names
- [ ] Existing 87+ file imports unchanged
