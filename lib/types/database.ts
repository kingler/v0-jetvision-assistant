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
  | 'trip_created'           // Avinode trip created, deep link available
  | 'awaiting_user_action'   // User must open Avinode to search
  | 'avinode_session_active' // User browsing Avinode marketplace
  | 'monitoring_for_quotes'  // Waiting for Avinode webhooks
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

// New enums for 3-party chat system
export type ConversationType =
  | 'rfp_negotiation'
  | 'quote_discussion'
  | 'general_inquiry'
  | 'support';

export type ConversationStatus =
  | 'active'
  | 'awaiting_response'
  | 'resolved'
  | 'archived';

export type ParticipantRole =
  | 'iso_agent'
  | 'ai_assistant'
  | 'operator'
  | 'admin'
  | 'observer';

export type MessageSenderType =
  | 'iso_agent'
  | 'ai_assistant'
  | 'operator'
  | 'system';

export type MessageContentType =
  | 'text'
  | 'quote_shared'
  | 'quote_updated'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_expired'
  | 'rfp_created'
  | 'rfp_updated'
  | 'proposal_shared'
  | 'document_attached'
  | 'booking_confirmed'
  | 'payment_requested'
  | 'system_notification'
  | 'workflow_update'
  | 'typing_indicator';

export type MessageStatus =
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type AvinodeEventType =
  | 'rfq_received'
  | 'rfq_updated'
  | 'rfq_cancelled'
  | 'quote_received'
  | 'quote_updated'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_expired'
  | 'message_received'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_updated'
  | 'trip_created'
  | 'trip_updated'
  | 'trip_cancelled';

export type WebhookProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'dead_letter';

export type OnlineStatus =
  | 'online'
  | 'away'
  | 'busy'
  | 'offline';

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface NotificationPreferences {
  email_new_quote: boolean;
  email_message: boolean;
  push_new_quote: boolean;
  push_message: boolean;
  desktop_notifications: boolean;
}

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
  // New fields for 3-party chat
  notification_preferences: NotificationPreferences;
  last_seen_at: string | null;
  online_status: OnlineStatus;
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
  // New Avinode integration fields
  avinode_rfp_id: string | null;
  avinode_trip_id: string | null;
  avinode_deep_link: string | null;
  primary_conversation_id: string | null;
  operators_contacted: number;
  quotes_expected: number;
  quotes_received: number;
  avinode_session_started_at: string | null;
  avinode_session_ended_at: string | null;
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
  // New Avinode/chat integration fields
  operator_profile_id: string | null;
  avinode_quote_id: string | null;
  conversation_id: string | null;
  operator_message: string | null;
  received_at: string | null;
  responded_at: string | null;
  expired_at: string | null;
  price_locked_until: string | null;
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
// NEW TABLES FOR 3-PARTY CHAT SYSTEM
// ============================================================================

export interface OperatorProfile {
  id: string;
  avinode_operator_id: string;
  company_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  headquarters_location: string | null;
  operator_rating: number | null;
  total_quotes: number;
  accepted_quotes: number;
  average_response_time_hours: number | null;
  aircraft_types: string[];
  certifications: string[];
  operating_regions: string[];
  is_preferred: boolean;
  is_active: boolean;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  request_id: string | null;
  quote_id: string | null;
  type: ConversationType;
  status: ConversationStatus;
  subject: string | null;
  avinode_thread_id: string | null;
  last_message_at: string | null;
  last_message_by: string | null;
  message_count: number;
  unread_count_iso: number;
  unread_count_operator: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  iso_agent_id: string | null;
  operator_profile_id: string | null;
  role: ParticipantRole;
  is_active: boolean;
  can_reply: boolean;
  can_invite: boolean;
  last_read_at: string | null;
  last_read_message_id: string | null;
  unread_count: number;
  notification_enabled: boolean;
  is_typing: boolean;
  typing_started_at: string | null;
  joined_at: string;
  left_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ReadReceipt {
  user_id: string;
  user_type: MessageSenderType;
  read_at: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_iso_agent_id: string | null;
  sender_operator_id: string | null;
  sender_name: string | null;
  content_type: MessageContentType;
  content: string | null;
  rich_content: Record<string, any> | null;
  attachments: MessageAttachment[];
  parent_message_id: string | null;
  thread_root_id: string | null;
  reply_count: number;
  status: MessageStatus;
  avinode_message_id: string | null;
  chatkit_message_id: string | null;
  read_by: ReadReceipt[];
  reactions: Record<string, Array<{ user_id: string; created_at: string }>>;
  is_edited: boolean;
  edited_at: string | null;
  original_content: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AvinodeWebhookEvent {
  id: string;
  event_type: AvinodeEventType;
  avinode_event_id: string;
  avinode_timestamp: string | null;
  request_id: string | null;
  quote_id: string | null;
  conversation_id: string | null;
  operator_profile_id: string | null;
  message_id: string | null;
  avinode_rfp_id: string | null;
  avinode_quote_id: string | null;
  avinode_trip_id: string | null;
  avinode_thread_id: string | null;
  raw_payload: Record<string, any>;
  parsed_data: Record<string, any> | null;
  processing_status: WebhookProcessingStatus;
  processed_at: string | null;
  processing_duration_ms: number | null;
  error_message: string | null;
  error_stack: string | null;
  retry_count: number;
  next_retry_at: string | null;
  max_retries: number;
  signature_verified: boolean;
  webhook_secret_version: string | null;
  source_ip: string | null;
  user_agent: string | null;
  headers: Record<string, any>;
  received_at: string;
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
      // New tables for 3-party chat system
      operator_profiles: {
        Row: OperatorProfile;
        Insert: Omit<OperatorProfile, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OperatorProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Conversation, 'id' | 'created_at' | 'updated_at'>>;
      };
      conversation_participants: {
        Row: ConversationParticipant;
        Insert: Omit<ConversationParticipant, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ConversationParticipant, 'id' | 'created_at' | 'updated_at'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Message, 'id' | 'created_at' | 'updated_at'>>;
      };
      avinode_webhook_events: {
        Row: AvinodeWebhookEvent;
        Insert: Omit<AvinodeWebhookEvent, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AvinodeWebhookEvent, 'id' | 'created_at'>>;
      };
    };
    Views: {
      pending_webhook_events: {
        Row: AvinodeWebhookEvent;
      };
    };
    Functions: {
      calculate_webhook_retry_time: {
        Args: { retry_count: number };
        Returns: string;
      };
      claim_webhook_event: {
        Args: { event_id: string };
        Returns: boolean;
      };
      complete_webhook_event: {
        Args: {
          event_id: string;
          p_request_id?: string;
          p_quote_id?: string;
          p_conversation_id?: string;
          p_message_id?: string;
          p_parsed_data?: Record<string, any>;
        };
        Returns: void;
      };
      fail_webhook_event: {
        Args: {
          event_id: string;
          p_error_message: string;
          p_error_stack?: string;
        };
        Returns: void;
      };
      get_or_create_request_conversation: {
        Args: {
          p_request_id: string;
          p_iso_agent_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      request_status: RequestStatus;
      quote_status: QuoteStatus;
      user_role: UserRole;
      margin_type: MarginType;
      execution_status: ExecutionStatus;
      agent_type: AgentType;
      // New enums for 3-party chat
      conversation_type: ConversationType;
      conversation_status: ConversationStatus;
      participant_role: ParticipantRole;
      message_sender_type: MessageSenderType;
      message_content_type: MessageContentType;
      message_status: MessageStatus;
      avinode_event_type: AvinodeEventType;
      webhook_processing_status: WebhookProcessingStatus;
    };
  };
}
