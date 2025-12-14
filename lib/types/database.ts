/**
 * Database Type Definitions
 * Re-export from Supabase generated types
 */

// Re-export all types from generated supabase types
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from './supabase';

// Export Constants for runtime enum values
export { Constants } from './supabase';

// ============================================================================
// CONVENIENCE TYPE ALIASES
// ============================================================================

import type { Database as DB } from './supabase';

// Enum type aliases
export type RequestStatus = DB['public']['Enums']['request_status'];
export type QuoteStatus = DB['public']['Enums']['quote_status'];
export type UserRole = DB['public']['Enums']['user_role'];
export type MarginType = DB['public']['Enums']['margin_type'];
export type ExecutionStatus = DB['public']['Enums']['execution_status'];
export type AgentType = DB['public']['Enums']['agent_type'];
export type ProposalStatus = DB['public']['Enums']['proposal_status'];
export type SessionStatus = DB['public']['Enums']['session_status'];

// Table Row type aliases
export type User = DB['public']['Tables']['users']['Row'];
export type ClientProfile = DB['public']['Tables']['client_profiles']['Row'];
export type Request = DB['public']['Tables']['requests']['Row'];
export type Quote = DB['public']['Tables']['quotes']['Row'];
export type Proposal = DB['public']['Tables']['proposals']['Row'];
export type WorkflowState = DB['public']['Tables']['workflow_states']['Row'];
export type AgentExecution = DB['public']['Tables']['agent_executions']['Row'];
export type ChatkitSession = DB['public']['Tables']['chatkit_sessions']['Row'];

// Legacy aliases for backward compatibility
export type IsoAgent = User;
