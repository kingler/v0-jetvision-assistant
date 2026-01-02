/**
 * Supabase Client Exports
 *
 * Three categories of exports:
 * 1. supabase - Standard client with RLS (client-side safe)
 * 2. supabaseAdmin - Service role client (server-side only)
 * 3. MCP helpers - Generic query operations for AI agents
 *
 * Note: Supabase is connected to Clerk for authentication.
 * Users are synced via syncUserFromClerk() using clerk_user_id.
 */

// Client-side safe client (uses anon key, respects RLS)
export {
  supabase,
  getUserProfile,
  getUserRequests,
  getRequest,
  createRequest,
  getQuotesForRequest,
} from './client';

// Server-side admin client (uses service role key, bypasses RLS)
export {
  supabaseAdmin,
  logAgentExecution,
  createWorkflowState,
  createQuote,
  syncUserFromClerk,
  updateRequestWithAvinodeTrip,
  // Trip ID lookup helpers
  findRequestByTripId,
  listUserTrips,
  upsertRequestWithTripId,
} from './admin';

// MCP Server helpers (generic query operations for AI agents)
export {
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
  type MCPResult,
} from './mcp-helpers';
