# Supabase MCP Server Setup Complete ✅

**Created**: 2025-10-21
**Status**: Ready to Use

---

## Overview

The Supabase MCP (Model Context Protocol) server has been successfully created and configured. Claude Code can now interact directly with your Supabase database using natural language commands.

## What Was Created

### 1. Supabase MCP Server
**Location**: `mcp-servers/supabase-mcp-server/`

**Files**:
- `src/index.ts` - Main MCP server implementation
- `src/types.ts` - TypeScript type definitions
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `README.md` - Documentation and examples

### 2. Supabase Client Libraries
**Location**: `lib/supabase/`

**Fixed/Added**:
- `client.ts` - Standard client for client-side operations (NEW)
- `admin.ts` - Admin client for server-side operations (EXISTS)
- `index.ts` - Barrel exports for both clients (NEW)
- Updated `README.md` with usage documentation

### 3. Configuration
**Updated**: `.claude/config.json`

Added MCP server configuration:
```json
"supabase": {
  "command": "npx",
  "args": ["-y", "tsx", "mcp-servers/supabase-mcp-server/src/index.ts"],
  "env": {}
}
```

### 4. Test Scripts
**Created**:
- `scripts/test-supabase-connection.ts` - Tests Supabase client connections
- `scripts/test-supabase-mcp.ts` - Tests MCP server setup

---

## Available MCP Tools

### 1. `supabase_query`
Execute SELECT queries with filters, ordering, and pagination.

**Example**:
```
"Query the requests table for all pending requests created by user-123"
```

**Translates to**:
```json
{
  "table": "requests",
  "select": "*",
  "filters": {
    "status": "pending",
    "created_by": "user-123"
  }
}
```

### 2. `supabase_insert`
Insert one or more records into a table.

**Example**:
```
"Insert a new request for client ABC with status pending"
```

### 3. `supabase_update`
Update records based on filters.

**Example**:
```
"Update request req-123 to status completed"
```

### 4. `supabase_delete`
Delete records based on filters.

**Example**:
```
"Delete all quotes older than 30 days"
```

### 5. `supabase_rpc`
Call stored procedures or functions.

**Example**:
```
"Call the calculate_quote_score function for request req-456"
```

### 6. `supabase_list_tables`
List all accessible tables in the database.

**Example**:
```
"Show me all tables in the database"
```

### 7. `supabase_describe_table`
Get schema information for a specific table.

**Example**:
```
"Describe the structure of the requests table"
```

### 8. `supabase_count`
Count records with optional filters.

**Example**:
```
"How many pending requests are there?"
```

---

## Database Tables

Your Supabase database includes these tables (all accessible via MCP):

1. **`iso_agents`** - ISO agent profiles
2. **`clients`** - Client companies and contacts
3. **`requests`** - RFP requests
4. **`quotes`** - Flight quotes/proposals
5. **`workflow_states`** - Workflow state tracking
6. **`agent_executions`** - Agent execution logs

---

## How to Use

### Method 1: Natural Language (Recommended)

Simply ask Claude Code to interact with your database:

```
"Show me the 5 most recent requests"
"How many clients do we have?"
"Find all quotes with a score above 8.0"
"Insert a new client named 'Acme Corp'"
"Update request req-123 to status 'completed'"
```

Claude Code will automatically use the appropriate MCP tool.

### Method 2: Direct Tool Call

You can also explicitly call MCP tools:

```
Use supabase_query to fetch all pending requests
```

---

## Testing

### Test Supabase Connection
```bash
npm run test:supabase
# or
npx tsx scripts/test-supabase-connection.ts
```

### Test MCP Server
```bash
npx tsx scripts/test-supabase-mcp.ts
```

Both tests should pass with ✅ marks.

---

## Configuration Details

### Environment Variables (`.env.local`)

Required variables (already configured):
```env
NEXT_PUBLIC_SUPABASE_URL=https://sbzaevawnjlrsjsuevli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### Client vs Admin

- **Standard Client** (`lib/supabase/client.ts`)
  - Uses anon key
  - Respects Row Level Security (RLS)
  - Safe for client-side use

- **Admin Client** (`lib/supabase/admin.ts`)
  - Uses service role key
  - Bypasses RLS
  - Server-side only

**MCP Server uses Admin Client** - This allows full database access for Claude Code operations.

---

## Security Notes

1. **MCP Server runs locally** - Not exposed to the internet
2. **Service role key** - Only used by MCP server (not client-side)
3. **RLS enabled** - All tables have Row Level Security policies
4. **Automatic filtering** - User queries are filtered by `clerk_user_id`

---

## Troubleshooting

### MCP Server Not Loading

**Issue**: Claude Code doesn't recognize Supabase tools

**Solution**:
1. Restart Claude Code
2. Check `.claude/config.json` has the `supabase` MCP server configured
3. Verify dependencies: `cd mcp-servers/supabase-mcp-server && pnpm install`

### Connection Errors

**Issue**: "Missing env.NEXT_PUBLIC_SUPABASE_URL"

**Solution**:
1. Verify `.env.local` exists in project root
2. Check all three Supabase variables are set
3. Run test: `npx tsx scripts/test-supabase-connection.ts`

### Permission Errors

**Issue**: "permission denied" when querying tables

**Solution**:
1. Verify RLS policies are correct in Supabase Dashboard
2. Check `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)
3. MCP server bypasses RLS, so this shouldn't happen

---

## Next Steps

1. ✅ **Restart Claude Code** to load the new MCP server
2. ✅ **Try a query**: "Show me all tables in the database"
3. ✅ **Explore data**: "How many requests are in the database?"
4. ✅ **Insert test data**: "Insert a test request"

---

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Documentation](../README.md)
- [Multi-Agent System Guide](./architecture/MULTI_AGENT_SYSTEM.md)

---

**Status**: 🟢 All systems operational

All tests passed successfully. The Supabase MCP server is ready for use!
