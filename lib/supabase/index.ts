/**
 * Supabase Client Exports
 *
 * Two clients available:
 * 1. supabase - Standard client with RLS (client-side safe)
 * 2. supabaseAdmin - Service role client (server-side only)
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
} from './admin';
