/**
 * 3-Party Chat System Type Definitions
 * Types for multi-party communication between ISO Agents, AI Assistant, and Flight Operators
 */

// ============================================================================
// ENUMS - Match database enums exactly
// ============================================================================

export type ConversationType =
  | 'rfp_negotiation'
  | 'quote_discussion'
  | 'general_inquiry'
  | 'booking_confirmation'
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

// ============================================================================
// OPERATOR TYPES
// ============================================================================

export interface OperatorProfile {
  id: string;
  avinode_operator_id: string;
  avinode_company_id: string | null;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  aoc_number: string | null;
  country_code: string | null;
  region: string | null;
  operator_rating: number | null;
  fleet_size: number | null;
  aircraft_types: string[];
  certifications: string[];
  preferred_contact_method: 'avinode' | 'email' | 'both';
  notification_preferences: Record<string, unknown>;
  is_active: boolean;
  is_preferred_partner: boolean;
  metadata: Record<string, unknown>;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperatorProfileInsert {
  avinode_operator_id: string;
  avinode_company_id?: string | null;
  company_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  aoc_number?: string | null;
  country_code?: string | null;
  region?: string | null;
  operator_rating?: number | null;
  fleet_size?: number | null;
  aircraft_types?: string[];
  certifications?: string[];
  preferred_contact_method?: 'avinode' | 'email' | 'both';
  notification_preferences?: Record<string, unknown>;
  is_active?: boolean;
  is_preferred_partner?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface Conversation {
  id: string;
  request_id: string | null;
  quote_id: string | null;
  type: ConversationType;
  status: ConversationStatus;
  subject: string | null;
  avinode_thread_id: string | null;
  chatkit_thread_id: string | null;
  last_message_at: string | null;
  last_message_by: string | null;
  message_count: number;
  unread_count_iso: number;
  unread_count_operator: number;
  is_priority: boolean;
  is_pinned: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConversationInsert {
  request_id?: string | null;
  quote_id?: string | null;
  type?: ConversationType;
  status?: ConversationStatus;
  subject?: string | null;
  avinode_thread_id?: string | null;
  chatkit_thread_id?: string | null;
  is_priority?: boolean;
  is_pinned?: boolean;
  metadata?: Record<string, unknown>;
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
  notifications_enabled: boolean;
  muted_until: string | null;
  is_typing: boolean;
  typing_started_at: string | null;
  joined_at: string;
  left_at: string | null;
  metadata: Record<string, unknown>;
}

export interface ConversationParticipantInsert {
  conversation_id: string;
  iso_agent_id?: string | null;
  operator_profile_id?: string | null;
  role: ParticipantRole;
  is_active?: boolean;
  can_reply?: boolean;
  can_invite?: boolean;
  notifications_enabled?: boolean;
}

// Extended type with related data
export interface ConversationWithParticipants extends Conversation {
  participants: ConversationParticipant[];
}

export interface ConversationWithDetails extends ConversationWithParticipants {
  request?: {
    id: string;
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    passengers: number;
    status: string;
  };
  quote?: {
    id: string;
    operator_name: string;
    total_price: number;
    status: string;
  };
  last_message?: Message;
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export interface MessageAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number;
  url: string;
  thumbnail_url?: string;
}

export interface ReadReceipt {
  user_id: string;
  user_type: 'iso_agent' | 'operator';
  read_at: string;
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
  rich_content: RichMessageContent | null;
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
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MessageInsert {
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_iso_agent_id?: string | null;
  sender_operator_id?: string | null;
  sender_name?: string | null;
  content_type?: MessageContentType;
  content?: string | null;
  rich_content?: RichMessageContent | null;
  attachments?: MessageAttachment[];
  parent_message_id?: string | null;
  thread_root_id?: string | null;
  avinode_message_id?: string | null;
  chatkit_message_id?: string | null;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// RICH MESSAGE CONTENT TYPES
// ============================================================================

export interface QuoteSharedContent {
  quote_id: string;
  operator_name: string;
  aircraft_type: string;
  price: number;
  currency: string;
  valid_until: string;
  highlights?: string[];
  score?: number;
  ranking?: number;
}

export interface QuoteUpdateContent {
  quote_id: string;
  update_type: 'price_change' | 'availability_change' | 'terms_change' | 'status_change';
  previous_price?: number;
  new_price?: number;
  change_reason?: string;
  fields_updated: string[];
  new_status?: string;
}

export interface RFPCreatedContent {
  request_id: string;
  route: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  passengers: number;
  aircraft_preference?: string;
  special_requirements?: string;
  operators_contacted?: number;
}

export interface ProposalSharedContent {
  proposal_id: string;
  title: string;
  quote_id: string;
  operator_name: string;
  aircraft_type: string;
  total_amount: number;
  currency: string;
  download_url: string;
  preview_url?: string;
}

export interface WorkflowUpdateContent {
  workflow_id: string;
  request_id: string;
  stage: string;
  previous_stage?: string;
  progress: number; // 0-100
  message: string;
  details?: Array<{
    label: string;
    value: string | number;
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>;
  estimated_completion?: string;
}

export interface SystemNotificationContent {
  notification_type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    url: string;
    type?: 'link' | 'button';
  };
  dismissible?: boolean;
  expires_at?: string;
}

export interface DocumentAttachedContent {
  document_id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  preview_url?: string;
  description?: string;
}

export interface BookingConfirmedContent {
  booking_id: string;
  confirmation_number: string;
  quote_id: string;
  operator_name: string;
  aircraft_type: string;
  route: string;
  departure_date: string;
  total_amount: number;
  currency: string;
  payment_status?: string;
}

// Discriminated union for rich content
export type RichMessageContent =
  | { type: 'quote_shared'; data: QuoteSharedContent }
  | { type: 'quote_updated'; data: QuoteUpdateContent }
  | { type: 'quote_accepted'; data: QuoteSharedContent }
  | { type: 'quote_rejected'; data: QuoteSharedContent & { rejection_reason?: string } }
  | { type: 'rfp_created'; data: RFPCreatedContent }
  | { type: 'rfp_updated'; data: RFPCreatedContent }
  | { type: 'proposal_shared'; data: ProposalSharedContent }
  | { type: 'workflow_update'; data: WorkflowUpdateContent }
  | { type: 'system_notification'; data: SystemNotificationContent }
  | { type: 'document_attached'; data: DocumentAttachedContent }
  | { type: 'booking_confirmed'; data: BookingConfirmedContent };

// ============================================================================
// AVINODE WEBHOOK TYPES
// ============================================================================

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
  raw_payload: AvinodeWebhookPayload;
  parsed_data: Record<string, unknown> | null;
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
  headers: Record<string, string>;
  received_at: string;
  created_at: string;
}

// Avinode webhook payload structure
export interface AvinodeWebhookPayload {
  event_id: string;
  event_type: string;
  timestamp: string;
  data: AvinodeRFQPayload | AvinodeQuotePayload | AvinodeMessagePayload | AvinodeTripPayload;
}

export interface AvinodeRFQPayload {
  rfq_id: string;
  trip_id?: string;
  buyer_company_id: string;
  buyer_company_name: string;
  buyer_account?: {
    id: string;
    name: string;
    email?: string;
  };
  flight_details: {
    segments: Array<{
      departure_airport: string;
      arrival_airport: string;
      departure_date: string;
      departure_time?: string;
    }>;
    passengers: number;
    aircraft_category?: string;
  };
  requested_lifts?: Array<{
    lift_id: string;
    aircraft_id: string;
    aircraft_type: string;
    registration?: string;
  }>;
  message?: string;
  quote_deadline?: string;
  status: 'new' | 'updated' | 'cancelled';
  links?: {
    self: string;
    tripmsgs?: string;
    quotes?: string;
  };
}

export interface AvinodeQuotePayload {
  quote_id: string;
  rfq_id: string;
  operator_id: string;
  operator_name: string;
  aircraft: {
    type: string;
    model: string;
    registration: string;
    year?: number;
    capacity: number;
    amenities?: string[];
  };
  pricing: {
    total: number;
    currency: string;
    breakdown?: {
      base_price: number;
      fuel_surcharge?: number;
      taxes?: number;
      fees?: number;
      overnight_fee?: number;
      catering?: number;
    };
  };
  schedule: {
    departure_time: string;
    arrival_time: string;
    duration_minutes: number;
  };
  valid_until: string;
  terms?: string;
  cancellation_policy?: string;
  message?: string;
  status: 'submitted' | 'updated' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
  links?: {
    self: string;
    accept?: string;
    decline?: string;
  };
}

export interface AvinodeMessagePayload {
  message_id: string;
  thread_id: string;
  rfq_id?: string;
  quote_id?: string;
  trip_id?: string;
  sender: {
    type: 'buyer' | 'seller';
    company_id: string;
    company_name: string;
    user_id?: string;
    user_name?: string;
  };
  content: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  sent_at: string;
  links?: {
    viewInAvinode?: string;
    reply?: string;
  };
}

export interface AvinodeTripPayload {
  trip_id: string;
  status: 'created' | 'updated' | 'cancelled';
  deep_link?: string;
  search_params?: {
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    passengers: number;
    aircraft_category?: string;
  };
  created_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Create conversation
export interface CreateConversationRequest {
  request_id?: string;
  quote_id?: string;
  type?: ConversationType;
  subject?: string;
  initial_message?: string;
  participant_iso_agent_ids?: string[];
  participant_operator_ids?: string[];
}

export interface CreateConversationResponse {
  conversation: ConversationWithParticipants;
  initial_message?: Message;
}

// Send message
export interface SendMessageRequest {
  conversation_id: string;
  content?: string;
  content_type?: MessageContentType;
  rich_content?: RichMessageContent;
  attachments?: Omit<MessageAttachment, 'id'>[];
  parent_message_id?: string;
}

export interface SendMessageResponse {
  message: Message;
}

// List messages
export interface ListMessagesParams {
  conversation_id: string;
  limit?: number;
  before?: string; // Message ID for pagination
  after?: string; // Message ID for pagination
}

export interface ListMessagesResponse {
  messages: Message[];
  has_more: boolean;
  total_count: number;
}

// List conversations
export interface ListConversationsParams {
  status?: ConversationStatus;
  type?: ConversationType;
  request_id?: string;
  limit?: number;
  offset?: number;
}

export interface ListConversationsResponse {
  conversations: ConversationWithDetails[];
  total_count: number;
  has_more: boolean;
}

// Mark as read
export interface MarkAsReadRequest {
  conversation_id: string;
  message_id: string;
}

// Typing indicator
export interface TypingIndicatorRequest {
  conversation_id: string;
  is_typing: boolean;
}

// Webhook handler response
export interface WebhookHandlerResponse {
  success: boolean;
  event_id: string;
  processed: boolean;
  message?: string;
  error?: string;
  created_entities?: {
    request_id?: string;
    quote_id?: string;
    conversation_id?: string;
    message_id?: string;
    operator_profile_id?: string;
  };
}

// ============================================================================
// REALTIME EVENT TYPES
// ============================================================================

export interface RealtimeMessageEvent {
  type: 'new_message';
  conversation_id: string;
  message: Message;
}

export interface RealtimeTypingEvent {
  type: 'typing';
  conversation_id: string;
  user_id: string;
  user_type: 'iso_agent' | 'operator';
  user_name: string;
  is_typing: boolean;
}

export interface RealtimeReadReceiptEvent {
  type: 'read_receipt';
  conversation_id: string;
  message_id: string;
  user_id: string;
  user_type: 'iso_agent' | 'operator';
  read_at: string;
}

export interface RealtimeConversationUpdateEvent {
  type: 'conversation_update';
  conversation_id: string;
  updates: Partial<Conversation>;
}

export type RealtimeChatEvent =
  | RealtimeMessageEvent
  | RealtimeTypingEvent
  | RealtimeReadReceiptEvent
  | RealtimeConversationUpdateEvent;
