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
/**
 * User type - Alias for ISO Agent from iso_agents table
 * 
 * @description This is intentionally an alias for the iso_agents table.
 * The database schema uses 'iso_agents' as the table name, but throughout
 * the codebase we refer to users conceptually. This type provides a clean
 * abstraction that maps the logical 'User' concept to the physical 'iso_agents' table.
 * 
 * @note The database does NOT have a separate 'users' table. All user data
 * is stored in the 'iso_agents' table, which represents ISO agents, admins,
 * and operators.
 * 
 * @see IsoAgent - Same type, explicit name
 * @see DB['public']['Tables']['iso_agents']['Row'] - Source type
 */
export type User = DB['public']['Tables']['iso_agents']['Row'];

/**
 * ISO Agent type - Explicit type alias for iso_agents table
 * 
 * @description Explicit type for ISO agents stored in the iso_agents table.
 * This is the same as User but with a more specific name that matches the
 * database table name.
 * 
 * @see User - Same type, conceptual name
 */
export type IsoAgent = DB['public']['Tables']['iso_agents']['Row'];

export type ClientProfile = DB['public']['Tables']['client_profiles']['Row'];
export type Request = DB['public']['Tables']['requests']['Row'];
export type Quote = DB['public']['Tables']['quotes']['Row'];
export type Proposal = DB['public']['Tables']['proposals']['Row'];
export type WorkflowState = DB['public']['Tables']['workflow_states']['Row'];
export type AgentExecution = DB['public']['Tables']['agent_executions']['Row'];
export type ChatkitSession = DB['public']['Tables']['chatkit_sessions']['Row'];
