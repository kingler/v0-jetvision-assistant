/**
 * JetvisionAgent Types
 *
 * Single-agent architecture with unified access to:
 * - Avinode MCP (flight search, trips, quotes)
 * - Database MCP (CRM tables)
 * - Gmail MCP (email sending)
 */

// =============================================================================
// TOOL CATEGORIES
// =============================================================================

export type ToolCategory = 'avinode' | 'database' | 'gmail';

// =============================================================================
// AVINODE TOOLS
// =============================================================================

export interface AvinodeTools {
  // Trip Management
  create_trip: {
    params: {
      departure_airport: string;
      arrival_airport: string;
      departure_date: string;
      passengers: number;
      departure_time?: string;
      return_date?: string;
      return_time?: string;
      special_requirements?: string;
    };
    result: {
      trip_id: string;
      deep_link: string;
      status: string;
    };
  };

  get_rfq: {
    params: {
      rfq_id: string; // Accepts arfq-* or atrip-* (trip ID)
    };
    result: {
      trip_id: string;
      rfq_id: string;
      status: string;
      flights: AvinodeQuote[];
      deep_link: string;
    };
  };

  get_quote: {
    params: {
      quote_id: string;
    };
    result: AvinodeQuote;
  };

  cancel_trip: {
    params: {
      trip_id: string;
      reason?: string;
    };
    result: {
      success: boolean;
      message: string;
    };
  };

  // Messaging
  send_trip_message: {
    params: {
      trip_id: string;
      rfq_id: string;
      message: string;
    };
    result: {
      message_id: string;
      sent_at: string;
    };
  };

  get_trip_messages: {
    params: {
      trip_id?: string;
      request_id?: string;
    };
    result: {
      messages: AvinodeMessage[];
    };
  };

  // Search
  search_airports: {
    params: {
      query: string;
    };
    result: {
      airports: Airport[];
    };
  };

  search_empty_legs: {
    params: {
      departure_airport?: string;
      arrival_airport?: string;
      date_from?: string;
      date_to?: string;
    };
    result: {
      empty_legs: EmptyLeg[];
    };
  };
}

export interface AvinodeQuote {
  quoteId: string;
  rfqId: string;
  operatorId: string;
  operatorName: string;
  aircraftType: string;
  tailNumber?: string;
  totalPrice: number;
  currency: string;
  validUntil?: string;
  rfqStatus: 'pending' | 'quoted' | 'accepted' | 'rejected' | 'expired';
  schedule?: {
    departure: string;
    arrival: string;
    flightTime: string;
  };
}

export interface AvinodeMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderType: 'buyer' | 'seller';
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface Airport {
  icao: string;
  iata?: string;
  name: string;
  city: string;
  country: string;
}

export interface EmptyLeg {
  id: string;
  departure: Airport;
  arrival: Airport;
  departureDate: string;
  aircraftType: string;
  operatorName: string;
  price?: number;
  currency?: string;
}

// =============================================================================
// DATABASE (CRM) TOOLS
// =============================================================================

export interface DatabaseTools {
  // Client Management
  get_client: {
    params: {
      client_id?: string;
      email?: string;
    };
    result: ClientProfile | null;
  };

  list_clients: {
    params: {
      iso_agent_id: string;
      search?: string;
      limit?: number;
    };
    result: {
      clients: ClientProfile[];
      total: number;
    };
  };

  create_client: {
    params: {
      company_name: string;
      contact_name: string;
      email: string;
      phone?: string;
      notes?: string;
      preferences?: Record<string, unknown>;
    };
    result: ClientProfile;
  };

  update_client: {
    params: {
      client_id: string;
      updates: Partial<ClientProfile>;
    };
    result: ClientProfile;
  };

  // Request Management
  get_request: {
    params: {
      request_id: string;
    };
    result: FlightRequest | null;
  };

  list_requests: {
    params: {
      iso_agent_id: string;
      status?: string;
      client_id?: string;
      limit?: number;
    };
    result: {
      requests: FlightRequest[];
      total: number;
    };
  };

  update_request: {
    params: {
      request_id: string;
      updates: Partial<FlightRequest>;
    };
    result: FlightRequest;
  };

  // Quote Management
  get_quotes: {
    params: {
      request_id: string;
    };
    result: {
      quotes: Quote[];
    };
  };

  update_quote_status: {
    params: {
      quote_id: string;
      status: 'pending' | 'received' | 'analyzed' | 'accepted' | 'rejected' | 'expired';
      notes?: string;
    };
    result: Quote;
  };

  // Operator Management
  get_operator: {
    params: {
      operator_id?: string;
      avinode_operator_id?: string;
    };
    result: OperatorProfile | null;
  };

  list_preferred_operators: {
    params: {
      region?: string;
      aircraft_type?: string;
    };
    result: {
      operators: OperatorProfile[];
    };
  };

  // Proposal Management
  create_proposal: {
    params: {
      request_id: string;
      quote_id: string;
      title: string;
      margin_applied?: number;
    };
    result: Proposal;
  };

  get_proposal: {
    params: {
      proposal_id: string;
    };
    result: Proposal | null;
  };
}

export interface ClientProfile {
  id: string;
  iso_agent_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  notes?: string;
  preferences?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlightRequest {
  id: string;
  iso_agent_id: string;
  client_profile_id?: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  return_date?: string;
  passengers: number;
  special_requirements?: string;
  status: string;
  avinode_trip_id?: string;
  avinode_rfq_id?: string;
  avinode_deep_link?: string;
  quotes_received?: number;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  request_id: string;
  avinode_quote_id?: string;
  operator_id: string;
  operator_name: string;
  aircraft_type: string;
  base_price: number;
  total_price: number;
  status: string;
  valid_until?: string;
  created_at: string;
}

export interface OperatorProfile {
  id: string;
  avinode_operator_id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  aircraft_types?: string[];
  region?: string;
  operator_rating?: number;
  is_preferred_partner: boolean;
}

export interface Proposal {
  id: string;
  request_id: string;
  quote_id?: string;
  iso_agent_id: string;
  client_profile_id?: string;
  proposal_number: string;
  title: string;
  status: string;
  total_amount?: number;
  margin_applied?: number;
  file_url: string;
  sent_at?: string;
  sent_to_email?: string;
}

// =============================================================================
// GMAIL TOOLS
// =============================================================================

export interface GmailTools {
  send_email: {
    params: {
      to: string;
      subject: string;
      body: string;
      cc?: string[];
      bcc?: string[];
      attachments?: EmailAttachment[];
      is_html?: boolean;
    };
    result: {
      message_id: string;
      thread_id: string;
      sent_at: string;
    };
  };

  send_proposal_email: {
    params: {
      proposal_id: string;
      to_email: string;
      to_name: string;
      custom_message?: string;
    };
    result: {
      message_id: string;
      proposal_url: string;
      sent_at: string;
    };
  };

  // Human-in-the-loop email approval: prepares email draft for review
  prepare_proposal_email: {
    params: {
      proposal_id: string;
      to_email: string;
      to_name: string;
      custom_message?: string;
    };
    result: {
      proposal_id: string;
      to_email: string;
      to_name: string;
      subject: string;
      body: string;
      attachments: Array<{
        name: string;
        url: string;
        size?: number;
      }>;
      status: 'draft';
    };
  };

  send_quote_email: {
    params: {
      request_id: string;
      quote_ids: string[];
      to_email: string;
      to_name: string;
      custom_message?: string;
    };
    result: {
      message_id: string;
      sent_at: string;
    };
  };
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  mime_type: string;
}

// =============================================================================
// UNIFIED TOOL INTERFACE
// =============================================================================

export type AllTools = AvinodeTools & DatabaseTools & GmailTools;

export type ToolName = keyof AllTools;

export interface ToolCall<T extends ToolName = ToolName> {
  name: T;
  params: AllTools[T]['params'];
}

export interface ToolResult<T extends ToolName = ToolName> {
  name: T;
  success: boolean;
  data?: AllTools[T]['result'];
  error?: string;
  /** Original input parameters passed to the tool (for MCP UI registry rendering) */
  input?: Record<string, unknown>;
}

// =============================================================================
// AGENT CONTEXT & RESULT
// =============================================================================

export interface AgentContext {
  sessionId: string;
  userId: string;
  isoAgentId: string;
  requestId?: string;
  conversationHistory?: ConversationMessage[];
  metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface AgentResult {
  success: boolean;
  message: string;
  data?: {
    tripId?: string;
    deepLink?: string;
    quotes?: AvinodeQuote[];
    client?: ClientProfile;
    request?: FlightRequest;
    proposal?: Proposal;
    emailSent?: boolean;
  };
  toolsUsed?: ToolResult[];
  nextAction?: 'await_user' | 'await_quotes' | 'send_proposal' | 'complete';
}

// =============================================================================
// CONVERSATION STATE
// =============================================================================

export interface ConversationState {
  sessionId: string;
  userId: string;
  history: ConversationMessage[];
  extractedData: {
    departureAirport?: string;
    arrivalAirport?: string;
    departureDate?: string;
    returnDate?: string;
    passengers?: number;
    specialRequirements?: string;
    clientEmail?: string;
    clientName?: string;
  };
  intent?: 'flight_request' | 'quote_inquiry' | 'client_lookup' | 'send_proposal' | 'general';
  missingFields: string[];
  clarificationRound: number;
  currentRequestId?: string;
  currentTripId?: string;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Structured working memory for cross-turn entity retention.
 * Stored in requests.workflow_state JSONB column.
 * Injected into system prompt so the LLM always has access to key IDs.
 */
export interface WorkingMemory {
  // Trip & RFQ tracking
  tripId?: string;
  rfqId?: string;
  deepLink?: string;

  // Client context
  clientId?: string;
  clientEmail?: string;
  clientName?: string;

  // Flight details (from create_trip)
  departureAirport?: string;
  arrivalAirport?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;

  // Workflow state
  workflowStage?: 'gathering_info' | 'trip_created' | 'awaiting_quotes' | 'quotes_received' | 'proposal_ready' | 'proposal_sent';
  quotesReceived?: number;

  // Metadata
  lastUpdated?: string;
}

// =============================================================================
// OPENAI TOOL DEFINITIONS (for function calling)
// =============================================================================

export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}
