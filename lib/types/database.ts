/**
 * Database Type Definitions
 * Generated from Supabase schema
 */

// ============================================================================
// ENUMS
// ============================================================================

export type RequestStatus =
  | 'draft'
  | 'pending'
  | 'analyzing'
  | 'fetching_client_data'
  | 'searching_flights'
  | 'awaiting_quotes'
  | 'analyzing_proposals'
  | 'generating_email'
  | 'sending_proposal'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type QuoteStatus =
  | 'pending'
  | 'received'
  | 'analyzed'
  | 'accepted'
  | 'rejected'
  | 'expired';

export type UserRole =
  | 'iso_agent'
  | 'admin'
  | 'operator';

export type MarginType =
  | 'percentage'
  | 'fixed';

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout';

export type AgentType =
  | 'orchestrator'
  | 'client_data'
  | 'flight_search'
  | 'proposal_analysis'
  | 'communication'
  | 'error_monitor';

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface IsoAgent {
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

export interface ClientProfile {
  id: string;
  iso_agent_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  preferences: Record<string, any>;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

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
  aircraft_details: Record<string, any>;
  availability_confirmed: boolean;
  valid_until: string | null;
  score: number | null;
  ranking: number | null;
  analysis_notes: string | null;
  status: QuoteStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowState {
  id: string;
  request_id: string;
  current_state: RequestStatus;
  previous_state: RequestStatus | null;
  agent_id: string | null;
  metadata: Record<string, any>;
  error_message: string | null;
  retry_count: number;
  state_entered_at: string;
  state_duration_ms: number | null;
  created_at: string;
}

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
  metadata: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailHistory {
  id: string;
  iso_agent_id: string;
  request_id: string;
  client_id: string;
  to_email: string;
  cc: string[] | null;
  bcc: string[] | null;
  subject: string;
  body: string;
  template_id: string | null;
  attachments: Record<string, any>[] | null;
  status: string;
  sent_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowHistory {
  id: string;
  request_id: string;
  from_state: RequestStatus;
  to_state: RequestStatus;
  agent_id: string | null;
  metadata: Record<string, any>;
  transitioned_at: string;
  created_at: string;
}

// ============================================================================
// DATABASE SCHEMA TYPE
// ============================================================================

export interface Database {
  public: {
    Tables: {
      iso_agents: {
        Row: IsoAgent;
        Insert: Omit<IsoAgent, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<IsoAgent, 'id' | 'created_at' | 'updated_at'>>;
      };
      client_profiles: {
        Row: ClientProfile;
        Insert: Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      requests: {
        Row: Request;
        Insert: Omit<Request, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Request, 'id' | 'created_at' | 'updated_at'>>;
      };
      quotes: {
        Row: Quote;
        Insert: Omit<Quote, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Quote, 'id' | 'created_at' | 'updated_at'>>;
      };
      workflow_states: {
        Row: WorkflowState;
        Insert: Omit<WorkflowState, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<WorkflowState, 'id' | 'created_at'>>;
      };
      agent_executions: {
        Row: AgentExecution;
        Insert: Omit<AgentExecution, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AgentExecution, 'id' | 'created_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      email_history: {
        Row: EmailHistory;
        Insert: Omit<EmailHistory, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<EmailHistory, 'id' | 'created_at' | 'updated_at'>>;
      };
      workflow_history: {
        Row: WorkflowHistory;
        Insert: Omit<WorkflowHistory, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<WorkflowHistory, 'id' | 'created_at'>>;
      };
    };
    Views: {};
    Functions: {};
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
