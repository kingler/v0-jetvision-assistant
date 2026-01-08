/**
 * Chat Module Type Definitions
 *
 * Centralized types for the chat interface and related functionality.
 */

import type { WorkflowStatusType, RFQStatusType, MessageTypeValue } from '../constants';

/**
 * SSE Stream Data from /api/chat endpoint
 */
export interface SSEStreamData {
  content?: string;
  done?: boolean;
  error?: string | { code: string; message: string; recoverable: boolean };
  message?: string;
  tool_calls?: ToolCallResult[];
  trip_data?: TripData;
  rfp_data?: RFPData;
  rfq_data?: RFQData;
  pipeline_data?: PipelineData;
  quotes?: Quote[];
  agent?: AgentMetadata;
  _debug?: Record<string, unknown>;
}

/**
 * Tool call result from agent execution
 */
export interface ToolCallResult {
  name: string;
  result?: Record<string, unknown>;
}

/**
 * Trip data from create_trip tool
 */
export interface TripData {
  trip_id: string;
  deep_link?: string;
  departure_airport?: AirportInfo;
  arrival_airport?: AirportInfo;
  departure_date?: string;
  passengers?: number;
  route?: {
    departure?: { date?: string; airport?: AirportInfo };
    arrival?: { airport?: AirportInfo };
  };
}

/**
 * RFP data from create_rfp tool
 */
export interface RFPData extends TripData {
  rfp_id?: string;
}

/**
 * RFQ data from get_rfq tool
 */
export interface RFQData {
  quotes?: Quote[];
  rfqs?: RFQItem[];
  flights?: RFQFlight[];
  total_rfqs?: number;
  total_quotes?: number;
  status?: string;
  message?: string;
}

/**
 * Individual RFQ item from API
 */
export interface RFQItem {
  rfq_id?: string;
  id?: string;
  status?: string;
  quotes?: Quote[];
  sellerLift?: unknown[];
  lifts?: unknown[];
  links?: {
    tripmsgs?: Array<{ id: string }>;
    quotes?: Array<{ id: string }>;
  };
}

/**
 * Quote data from API
 */
export interface Quote {
  quote_id?: string;
  quoteId?: string;
  id?: string;
  operator_name?: string;
  operatorName?: string;
  operator?: {
    name?: string;
    displayName?: string;
    rating?: number;
    email?: string;
    contact?: { email?: string };
  };
  aircraft_type?: string;
  aircraftType?: string;
  aircraft?: {
    type?: string;
    model?: string;
    registration?: string;
    tail_number?: string;
    capacity?: number;
    amenities?: string[];
  };
  sellerPrice?: {
    price: number;
    currency: string;
  };
  total_price?: number;
  price?: number;
  totalPrice?: { amount?: number; currency?: string };
  pricing?: {
    total?: number;
    amount?: number;
    currency?: string;
    base?: number;
    basePrice?: number;
    base_price?: number;
    fuel?: number;
    fuelSurcharge?: number;
    fuel_surcharge?: number;
    taxes?: number;
    fees?: number;
  };
  currency?: string;
  status?: string;
  rfq_status?: string;
  quote_status?: string;
  sourcingDisplayStatus?: string;
  departure_time?: string;
  departureTime?: string;
  arrival_time?: string;
  arrivalTime?: string;
  flight_duration?: string;
  flightDuration?: string;
  schedule?: {
    departureTime?: string;
    arrivalTime?: string;
    duration?: string;
  };
  operator_rating?: number;
  operatorRating?: number;
  operator_email?: string;
  operatorEmail?: string;
  tail_number?: string;
  tailNumber?: string;
  passenger_capacity?: number;
  passengerCapacity?: number;
  capacity?: number;
  amenities?: string[];
  features?: string[];
  sellerMessage?: string;
  notes?: string;
  score?: number;
  valid_until?: string;
  validUntil?: string;
  ranking?: number;
  isRecommended?: boolean;
}

/**
 * Airport information
 */
export interface AirportInfo {
  icao: string;
  name?: string;
  city?: string;
}

/**
 * RFQ Flight - normalized format for UI display
 */
export interface RFQFlight {
  id: string;
  quoteId: string;
  departureAirport: AirportInfo;
  arrivalAirport: AirportInfo;
  departureDate: string;
  departureTime?: string;
  flightDuration: string;
  aircraftType: string;
  aircraftModel?: string;
  tailNumber?: string;
  passengerCapacity: number;
  operatorName: string;
  operatorRating?: number;
  operatorEmail?: string;
  totalPrice: number;
  currency: string;
  amenities: AircraftAmenities;
  rfqStatus: RFQStatusType;
  lastUpdated: string;
  isSelected: boolean;
  validUntil?: string;
  aircraftCategory?: string;
  hasMedical: boolean;
  hasPackage: boolean;
  sellerMessage?: string;
  messageId?: string;
  hasMessages?: boolean;
  hasNewMessages?: boolean;
  priceBreakdown?: PriceBreakdown;
}

/**
 * Aircraft amenities
 */
export interface AircraftAmenities {
  wifi: boolean;
  pets: boolean;
  smoking: boolean;
  galley: boolean;
  lavatory: boolean;
  medical: boolean;
}

/**
 * Price breakdown
 */
export interface PriceBreakdown {
  basePrice: number;
  fuelSurcharge?: number;
  taxes: number;
  fees: number;
}

/**
 * Pipeline data for deals view
 */
export interface PipelineData {
  deals?: unknown[];
  requests?: unknown[];
  total?: number;
}

/**
 * Agent metadata from response
 */
export interface AgentMetadata {
  intent?: string;
  conversationState?: {
    phase?: 'gathering_info' | 'confirming' | 'processing' | 'complete';
  };
  nextActions?: unknown[];
}

/**
 * Deep link data for Avinode marketplace
 */
export interface DeepLinkData {
  rfpId?: string;
  tripId?: string;
  deepLink?: string;
  departureAirport?: AirportInfo | string;
  arrivalAirport?: AirportInfo | string;
  departureDate?: string;
  passengers?: number;
}

/**
 * Operator message
 */
export interface OperatorMessage {
  id: string;
  type: MessageTypeValue;
  content: string;
  timestamp: string;
  sender?: string;
}

/**
 * SSE parsing result
 */
export interface SSEParseResult {
  content: string;
  done: boolean;
  error?: string;
  toolCalls: ToolCallResult[];
  tripData?: TripData;
  rfpData?: RFPData;
  rfqData?: RFQData;
  pipelineData?: PipelineData;
  quotes: Quote[];
  agentMetadata?: AgentMetadata;
  debug?: Record<string, unknown>;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  showWorkflow?: boolean;
  showDeepLink?: boolean;
  deepLinkData?: DeepLinkData;
  showQuotes?: boolean;
  showProposal?: boolean;
  showCustomerPreferences?: boolean;
  showPipeline?: boolean;
  pipelineData?: PipelineData;
}

/**
 * Conversation history message for API
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Quote details map (quoteId -> quote details)
 */
export type QuoteDetailsMap = Record<string, Quote>;

/**
 * Operator messages map (quoteId -> messages)
 */
export type OperatorMessagesMap = Record<string, OperatorMessage[]>;
