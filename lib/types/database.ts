/**
 * JetVision AI Assistant - Database Types
 * Auto-generated TypeScript types for Supabase schema
 * Created: 2025-10-21
 *
 * This file provides complete type safety for all database operations.
 * Types are derived from the Supabase schema migrations.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum RequestStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  FETCHING_CLIENT_DATA = 'fetching_client_data',
  SEARCHING_FLIGHTS = 'searching_flights',
  AWAITING_QUOTES = 'awaiting_quotes',
  ANALYZING_PROPOSALS = 'analyzing_proposals',
  GENERATING_EMAIL = 'generating_email',
  SENDING_PROPOSAL = 'sending_proposal',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum QuoteStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  ANALYZED = 'analyzed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum UserRole {
  ISO_AGENT = 'iso_agent',
  ADMIN = 'admin',
  OPERATOR = 'operator',
}

export enum MarginType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

export enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  CLIENT_DATA = 'client_data',
  FLIGHT_SEARCH = 'flight_search',
  PROPOSAL_ANALYSIS = 'proposal_analysis',
  COMMUNICATION = 'communication',
  ERROR_MONITOR = 'error_monitor',
}

// ============================================================================
// TABLE ROW TYPES
// ============================================================================

/**
 * ISO Agent (User Profile)
 * Synced from Clerk authentication service
 */
export interface ISOAgent {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  margin_type: MarginType | null;
  margin_value: number | null;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Client Profile
 * Client information managed by ISO agents
 */
export interface ClientProfile {
  id: string;
  iso_agent_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  preferences: ClientPreferences;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Client Preferences (JSONB field structure)
 */
export interface ClientPreferences {
  preferred_aircraft?: string[];
  dietary_restrictions?: string[];
  preferred_amenities?: string[];
  budget_range?: {
    min: number;
    max: number;
  };
  [key: string]: any;
}

/**
 * Flight Request (RFP)
 * Flight requests submitted by ISO agents
 */
export interface Request {
  id: string;
  iso_agent_id: string;
  client_profile_id: string | null;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  return_date: string | null;
  passengers: number;
  aircraft_type: string | null;
  budget: number | null;
  special_requirements: string | null;
  status: RequestStatus;
  metadata: RequestMetadata;
  created_at: string;
  updated_at: string;
}

/**
 * Request Metadata (JSONB field structure)
 */
export interface RequestMetadata {
  avinode_rfp_id?: string;
  preferred_departure_time?: string;
  requires_customs_assistance?: boolean;
  [key: string]: any;
}

/**
 * Quote (Operator Proposal)
 * Quotes received from operators for flight requests
 */
export interface Quote {
  id: string;
  request_id: string;
  operator_id: string;
  operator_name: string;
  base_price: number;
  fuel_surcharge: number;
  taxes: number;
  fees: number;
  total_price: number;
  aircraft_type: string;
  aircraft_tail_number: string | null;
  aircraft_details: AircraftDetails;
  availability_confirmed: boolean;
  valid_until: string | null;
  score: number | null;
  ranking: number | null;
  analysis_notes: string | null;
  status: QuoteStatus;
  metadata: QuoteMetadata;
  created_at: string;
  updated_at: string;
}

/**
 * Aircraft Details (JSONB field structure)
 */
export interface AircraftDetails {
  year?: number;
  range_nm?: number;
  max_passengers?: number;
  amenities?: string[];
  crew?: number;
  flight_attendant?: boolean;
  [key: string]: any;
}

/**
 * Quote Metadata (JSONB field structure)
 */
export interface QuoteMetadata {
  avinode_quote_id?: string;
  response_time_hours?: number;
  [key: string]: any;
}

/**
 * Workflow State
 * State machine tracking for request processing
 */
export interface WorkflowState {
  id: string;
  request_id: string;
  current_state: RequestStatus;
  previous_state: RequestStatus | null;
  agent_id: string | null;
  metadata: WorkflowStateMetadata;
  error_message: string | null;
  retry_count: number;
  state_entered_at: string;
  state_duration_ms: number | null;
  created_at: string;
}

/**
 * Workflow State Metadata (JSONB field structure)
 */
export interface WorkflowStateMetadata {
  analysis_result?: string;
  client_found?: boolean;
  preferences_loaded?: boolean;
  avinode_rfp_created?: boolean;
  operators_contacted?: number;
  quotes_expected?: number;
  quotes_received?: number;
  quotes_analyzed?: number;
  best_quote_id?: string;
  email_sent?: boolean;
  pdf_generated?: boolean;
  [key: string]: any;
}

/**
 * Agent Execution
 * Execution logs for agent activities
 */
export interface AgentExecution {
  id: string;
  request_id: string | null;
  agent_type: AgentType;
  agent_id: string;
  input_data: Record<string, any> | null;
  output_data: Record<string, any> | null;
  execution_time_ms: number | null;
  status: ExecutionStatus;
  error_message: string | null;
  error_stack: string | null;
  retry_count: number;
  metadata: AgentExecutionMetadata;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

/**
 * Agent Execution Metadata (JSONB field structure)
 */
export interface AgentExecutionMetadata {
  model?: string;
  temperature?: number;
  data_source?: string;
  mcp_server?: string;
  template?: string;
  analysis_criteria?: string[];
  [key: string]: any;
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

export type ISOAgentInsert = Omit<ISOAgent, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ClientProfileInsert = Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type RequestInsert = Omit<Request, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type QuoteInsert = Omit<Quote, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type WorkflowStateInsert = Omit<WorkflowState, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type AgentExecutionInsert = Omit<AgentExecution, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ============================================================================
// UPDATE TYPES (for updating existing records)
// ============================================================================

export type ISOAgentUpdate = Partial<Omit<ISOAgent, 'id' | 'clerk_user_id' | 'created_at' | 'updated_at'>>;

export type ClientProfileUpdate = Partial<Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>>;

export type RequestUpdate = Partial<Omit<Request, 'id' | 'created_at' | 'updated_at'>>;

export type QuoteUpdate = Partial<Omit<Quote, 'id' | 'created_at' | 'updated_at'>>;

export type WorkflowStateUpdate = Partial<Omit<WorkflowState, 'id' | 'created_at'>>;

export type AgentExecutionUpdate = Partial<Omit<AgentExecution, 'id' | 'created_at'>>;

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

/**
 * Request with related data
 */
export interface RequestWithRelations extends Request {
  iso_agent?: ISOAgent;
  client_profile?: ClientProfile;
  quotes?: Quote[];
  workflow_states?: WorkflowState[];
  agent_executions?: AgentExecution[];
}

/**
 * Quote with related data
 */
export interface QuoteWithRelations extends Quote {
  request?: Request;
}

/**
 * Client Profile with related data
 */
export interface ClientProfileWithRelations extends ClientProfile {
  iso_agent?: ISOAgent;
  requests?: Request[];
}

/**
 * ISO Agent with related data
 */
export interface ISOAgentWithRelations extends ISOAgent {
  client_profiles?: ClientProfile[];
  requests?: Request[];
}

// ============================================================================
// DATABASE TYPE MAP
// ============================================================================

/**
 * Complete database schema type map
 * Useful for generic database operations
 */
export interface Database {
  public: {
    Tables: {
      iso_agents: {
        Row: ISOAgent;
        Insert: ISOAgentInsert;
        Update: ISOAgentUpdate;
      };
      client_profiles: {
        Row: ClientProfile;
        Insert: ClientProfileInsert;
        Update: ClientProfileUpdate;
      };
      requests: {
        Row: Request;
        Insert: RequestInsert;
        Update: RequestUpdate;
      };
      quotes: {
        Row: Quote;
        Insert: QuoteInsert;
        Update: QuoteUpdate;
      };
      workflow_states: {
        Row: WorkflowState;
        Insert: WorkflowStateInsert;
        Update: WorkflowStateUpdate;
      };
      agent_executions: {
        Row: AgentExecution;
        Insert: AgentExecutionInsert;
        Update: AgentExecutionUpdate;
      };
    };
    Views: {};
    Functions: {
      get_current_iso_agent_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      owns_resource: {
        Args: { resource_agent_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      request_status: RequestStatus;
      quote_status: QuoteStatus;
      user_role: UserRole;
      margin_type: MarginType;
      execution_status: ExecutionStatus;
      agent_type: AgentType;
    };
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Table names as union type
 */
export type TableName = keyof Database['public']['Tables'];

/**
 * Extract row type from table name
 */
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

/**
 * Extract insert type from table name
 */
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];

/**
 * Extract update type from table name
 */
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

/**
 * Supabase query result type helper
 */
export type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Supabase query result array type helper
 */
export type QueryResultArray<T> = {
  data: T[] | null;
  error: Error | null;
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ISOAgent
 */
export function isISOAgent(obj: any): obj is ISOAgent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.clerk_user_id === 'string' &&
    typeof obj.email === 'string' &&
    Object.values(UserRole).includes(obj.role)
  );
}

/**
 * Type guard for Request
 */
export function isRequest(obj: any): obj is Request {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.iso_agent_id === 'string' &&
    typeof obj.departure_airport === 'string' &&
    Object.values(RequestStatus).includes(obj.status)
  );
}

/**
 * Type guard for Quote
 */
export function isQuote(obj: any): obj is Quote {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.request_id === 'string' &&
    typeof obj.operator_id === 'string' &&
    Object.values(QuoteStatus).includes(obj.status)
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Request status values for validation
 */
export const REQUEST_STATUSES = Object.values(RequestStatus);

/**
 * Quote status values for validation
 */
export const QUOTE_STATUSES = Object.values(QuoteStatus);

/**
 * User role values for validation
 */
export const USER_ROLES = Object.values(UserRole);

/**
 * Agent type values for validation
 */
export const AGENT_TYPES = Object.values(AgentType);

/**
 * Execution status values for validation
 */
export const EXECUTION_STATUSES = Object.values(ExecutionStatus);

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default client preferences
 */
export const DEFAULT_CLIENT_PREFERENCES: ClientPreferences = {};

/**
 * Default request metadata
 */
export const DEFAULT_REQUEST_METADATA: RequestMetadata = {};

/**
 * Default aircraft details
 */
export const DEFAULT_AIRCRAFT_DETAILS: AircraftDetails = {};

/**
 * Default quote metadata
 */
export const DEFAULT_QUOTE_METADATA: QuoteMetadata = {};

/**
 * Default workflow state metadata
 */
export const DEFAULT_WORKFLOW_STATE_METADATA: WorkflowStateMetadata = {};

/**
 * Default agent execution metadata
 */
export const DEFAULT_AGENT_EXECUTION_METADATA: AgentExecutionMetadata = {};
